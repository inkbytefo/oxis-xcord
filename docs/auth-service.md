# Auth Service Documentation

## Overview
The Authentication Service is a crucial component of our microservices architecture, responsible for user authentication, authorization, and profile management. It provides secure endpoints for user registration, login, token management, and profile operations.

## Technical Stack
- Node.js with Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- Winston for logging

## Architecture
The service follows a modular architecture with clear separation of concerns:
```
src/
├── config/        # Configuration management
├── controllers/   # Business logic
├── middleware/    # Request processing middleware
├── models/        # Data models
└── routes/        # API route definitions
```

## Security Features
- Password strength validation (uppercase, lowercase, numbers, special characters)
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with salt
- Request logging with sensitive data redaction
- CORS protection
- Error handling with security considerations

## API Endpoints

### Public Routes
#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```
**Response:** `201 Created`
```json
{
  "message": "User registered successfully"
}
```

#### POST /api/auth/login
Authenticate user and receive tokens.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```
**Response:** `200 OK`
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "roles": ["string"]
  }
}
```

#### POST /api/auth/refresh-token
Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```
**Response:** `200 OK`
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

### Protected Routes
These routes require a valid JWT token in the Authorization header:
`Authorization: Bearer <token>`

#### POST /api/auth/logout
Invalidate current session.

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/auth/profile
Get current user's profile.

**Response:** `200 OK`
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "roles": ["string"],
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### PUT /api/auth/profile
Update user profile.

**Request Body:**
```json
{
  "email": "string",
  "currentPassword": "string",
  "newPassword": "string"
}
```
**Response:** `200 OK`
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "roles": ["string"]
  }
}
```

### Admin Routes
These routes require admin role access.

#### GET /api/auth/admin/users
List all users (admin only).

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "username": "string",
    "email": "string",
    "roles": ["string"],
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

## Error Handling
The service provides detailed error messages with appropriate HTTP status codes:

- 400: Bad Request (validation errors, duplicate entries)
- 401: Unauthorized (invalid credentials, expired token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

Error response format:
```json
{
  "status": "error",
  "message": "Error description",
  "errors": ["Detailed error messages (validation)"],
  "timestamp": "ISO date string"
}
```

## Environment Configuration
Required environment variables:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/auth

# JWT Configuration
JWT_SECRET=your-super-secret-key-here

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging Configuration
LOG_LEVEL=info
```

## Development Setup
1. Clone the repository
2. Navigate to the auth-service directory
3. Copy `.env.example` to `.env` and configure variables
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start MongoDB
6. Run the service:
   ```bash
   npm run dev
   ```

## Testing
Run the test suite:
```bash
npm test
```

## Logging
Logs are stored in:
- `error.log`: Error-level logs
- `combined.log`: All logs

In development, logs are also output to the console.
