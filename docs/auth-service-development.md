# Auth Service Development Guide

## Overview
This guide provides specific patterns and examples for developing and extending the Authentication Service.

## Authentication Patterns

### Token Management
```javascript
// Generate tokens
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    username: user.username,
    roles: user.roles
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn
  });

  const refreshToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn
  });

  return { accessToken, refreshToken };
};
```

### Password Handling
```javascript
// Password validation pattern
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Password hashing (handled by User model pre-save middleware)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
```

### Role-Based Access Control
```javascript
// Role checking middleware
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const hasRole = req.user.roles.some(role => roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

// Usage example
router.get('/admin/users', checkRole(['admin']), adminController.listUsers);
```

## Request Validation Examples

### Registration Validation
```javascript
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores and hyphens'),
  
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character')
];
```

### Profile Update Validation
```javascript
const validateProfileUpdate = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('currentPassword')
    .if(body('newPassword').exists())
    .notEmpty()
    .withMessage('Current password is required when setting new password'),
  
  body('newPassword')
    .optional()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number and one special character')
];
```

## Error Handling Pattern

```javascript
// Centralized error handler
export const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params,
      query: req.query
    }
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate key error',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};
```

## Testing Patterns

### Unit Tests
```javascript
describe('User Model', () => {
  it('should hash password before saving', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!'
    };

    const user = new User(userData);
    await user.save();

    expect(user.password).not.toBe(userData.password);
    expect(await user.comparePassword(userData.password)).toBe(true);
  });
});

describe('Auth Controller', () => {
  describe('register', () => {
    it('should create a new user', async () => {
      const req = {
        body: {
          username: 'newuser',
          email: 'new@example.com',
          password: 'Password123!'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User registered successfully'
      });
    });
  });
});
```

### Integration Tests
```javascript
describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
    });

    it('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});
```

## Logging Best Practices

```javascript
// Request logging
export const logRequest = (req, res, next) => {
  logger.info('Incoming Request:', {
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query,
    // Exclude sensitive data
    body: {
      ...req.body,
      password: undefined,
      currentPassword: undefined,
      newPassword: undefined
    }
  });
  next();
};

// Operation logging
logger.info({
  action: 'user_registered',
  userId: user._id,
  username: user.username
}, 'New user registered');

logger.error({
  action: 'login_failed',
  username: req.body.username,
  reason: 'invalid_credentials'
}, 'Login attempt failed');
```

## Security Considerations

1. **Password Storage**
   - Always hash passwords using bcrypt
   - Never store plain-text passwords
   - Use appropriate salt rounds (10-12 recommended)

2. **Token Security**
   - Short-lived access tokens (15 minutes recommended)
   - Longer-lived refresh tokens (7 days recommended)
   - Store refresh tokens in database for revocation support
   - Use secure cookie settings for token storage

3. **Request Security**
   - Implement rate limiting
   - Use CORS with specific origins
   - Validate and sanitize all inputs
   - Set security headers

4. **Error Handling**
   - Never expose internal errors to clients
   - Log errors securely (exclude sensitive data)
   - Return generic error messages in production

## Monitoring and Metrics

Key metrics to monitor:
- Login success/failure rates
- Registration success/failure rates
- Token refresh rates
- Average response times
- Error rates by type
- Active user sessions

## Performance Optimization

1. **Database Indexes**
```javascript
// User model indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ refreshToken: 1 });
```

2. **Caching Strategies**
```javascript
// Cache successful auth checks
const cacheSuccessfulAuth = async (token, userData) => {
  await redis.setex(`auth:${token}`, 300, JSON.stringify(userData)); // 5 minutes
};
```

3. **Query Optimization**
```javascript
// Select only needed fields
const user = await User.findById(id).select('-password -refreshToken');
