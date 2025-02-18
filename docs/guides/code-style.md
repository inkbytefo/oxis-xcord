# Kod Yazım Standartları

## Genel Prensipler

1. **Temiz Kod**
   - Okunabilir ve anlaşılır kod yazın
   - DRY (Don't Repeat Yourself) prensibini uygulayın
   - SOLID prensiplerine uyun
   - Karmaşık kod bloklarını basitleştirin

2. **Tutarlılık**
   - Proje genelinde tutarlı isimlendirme kullanın
   - Tutarlı kod düzeni ve yapısı sağlayın
   - Belirlenen standartları takip edin

3. **Dokümantasyon**
   - Karmaşık iş mantığını yorumlayın
   - Public API'leri dokümante edin
   - TypeDoc formatını kullanın
   - Örneklerle zenginleştirin

## TypeScript Standartları

### Tip Tanımlamaları

```typescript
// İyi ✅
interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

// Kötü ❌
interface user {
  id: any;
  Username: string;
  EMAIL: string;
  created_at: Date;
}
```

### Fonksiyonlar

```typescript
// İyi ✅
async function getUserById(id: string): Promise<User | null> {
  try {
    return await db.users.findOne({ id });
  } catch (error) {
    logger.error('User fetch failed:', error);
    return null;
  }
}

// Kötü ❌
async function getUser(id) {
  return db.users.findOne({ id })
    .catch(err => {
      console.log(err);
      return null;
    });
}
```

### Değişken İsimlendirme

```typescript
// İyi ✅
const maxRetryAttempts = 3;
const isUserActive = user.status === 'active';
const handleSubmit = () => { /* ... */ };

// Kötü ❌
const max = 3;
const active = user.status === 'active';
const submit = () => { /* ... */ };
```

## React Standartları

### Bileşen Yapısı

```tsx
// İyi ✅
interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  return (
    <div className="user-profile">
      <h2>{user.username}</h2>
      {/* ... */}
    </div>
  );
};

// Kötü ❌
function UserProfile(props) {
  return (
    <div className="user-profile">
      <h2>{props.user.username}</h2>
      {/* ... */}
    </div>
  );
}
```

### Hook Kullanımı

```tsx
// İyi ✅
const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const data = await api.getUsers();
        setUsers(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    // ...
  );
};

// Kötü ❌
const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getUsers()
      .then(data => setUsers(data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    // ...
  );
};
```

## Backend Standartları

### Hata Yönetimi

```typescript
// İyi ✅
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
  }
}

// Hata fırlatma
throw new AppError(400, 'Invalid input', 'INVALID_INPUT');

// Hata yakalama
try {
  await processData(input);
} catch (error) {
  if (error instanceof AppError) {
    logger.error(`[${error.code}] ${error.message}`);
    // Hata işleme...
  }
}
```

### Middleware Yapısı

```typescript
// İyi ✅
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new AppError(401, 'No token provided');
    }
    
    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

// Kötü ❌
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  
  try {
    const decoded = verify(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};
```

## Git Commit Mesajları

```bash
# İyi ✅
feat(auth): implement JWT refresh token mechanism
fix(api): resolve rate limiting issue in messaging service
docs(readme): update deployment instructions
test(user): add integration tests for profile update

# Kötü ❌
updated code
fixed bug
wip
quick fix
```

## Dosya Organizasyonu

```
src/
├── components/           # React bileşenleri
│   ├── common/          # Genel bileşenler
│   └── features/        # Özellik bazlı bileşenler
├── hooks/               # Custom React hooks
├── services/            # API servisleri
├── utils/               # Yardımcı fonksiyonlar
├── types/               # Tip tanımlamaları
└── contexts/            # React context'leri
```

## Güvenlik Standartları

1. **Giriş Doğrulama**
   ```typescript
   // İyi ✅
   const schema = Joi.object({
     username: Joi.string().min(3).max(30).required(),
     password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{8,30}$')).required()
   });

   const validateInput = (input: unknown): ValidationResult => {
     return schema.validate(input);
   };
   ```

2. **SQL Injection Önleme**
   ```typescript
   // İyi ✅
   await db.query('SELECT * FROM users WHERE id = $1', [userId]);

   // Kötü ❌
   await db.query(`SELECT * FROM users WHERE id = ${userId}`);
   ```

3. **XSS Önleme**
   ```typescript
   // İyi ✅
   import DOMPurify from 'dompurify';

   const sanitizeHTML = (dirty: string): string => {
     return DOMPurify.sanitize(dirty);
   };
   ```

## Test Standartları

```typescript
// İyi ✅
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid input', async () => {
      const input = {
        username: 'testuser',
        email: 'test@example.com'
      };
      
      const user = await userService.createUser(input);
      
      expect(user).toMatchObject(input);
      expect(user.id).toBeDefined();
    });

    it('should throw an error with invalid email', async () => {
      const input = {
        username: 'testuser',
        email: 'invalid-email'
      };
      
      await expect(userService.createUser(input))
        .rejects
        .toThrow('Invalid email format');
    });
  });
});
```

## Performans Standartları

1. **React Optimizasyonu**
   ```typescript
   // İyi ✅
   const MemoizedComponent = React.memo(({ data }) => {
     return (
       // Bileşen içeriği
     );
   });

   // useMemo ve useCallback kullanımı
   const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
   const memoizedCallback = useCallback((event) => doSomething(event), []);
   ```

2. **API İstekleri**
   ```typescript
   // İyi ✅
   const api = {
     get: async <T>(url: string): Promise<T> => {
       const cachedData = await cache.get(url);
       if (cachedData) return cachedData;

       const response = await fetch(url);
       const data = await response.json();
       
       await cache.set(url, data, 60); // 60 saniye cache
       return data;
     }
   };
   ```

## Linting ve Formatting

```json
// .eslintrc
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": "warn"
  }
}

// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}