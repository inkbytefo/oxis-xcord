# Kimlik Doğrulama Servisi (Auth Service)

## Genel Bakış

Auth Service, XCord platformunun kullanıcı kimlik doğrulama ve yetkilendirme işlemlerini yöneten temel servisidir.

## Özellikler

- JWT tabanlı kimlik doğrulama
- İki faktörlü kimlik doğrulama (2FA)
- OAuth2.0 entegrasyonu (Google ve GitHub)
- Oturum yönetimi
- Rol tabanlı yetkilendirme (RBAC)
- Şifre sıfırlama ve değiştirme
- Kullanıcı profil yönetimi

## Teknik Detaylar

### API Endpoints

```typescript
POST /auth/register     // Kullanıcı kaydı
POST /auth/login       // Giriş
POST /auth/logout      // Çıkış
POST /auth/refresh     // Token yenileme
GET  /auth/me          // Kullanıcı bilgileri
PUT  /auth/profile     // Profil güncelleme
POST /auth/2fa/enable  // 2FA aktivasyonu
POST /auth/2fa/verify  // 2FA doğrulama

// OAuth endpoints
GET  /auth/google      // Google ile giriş
GET  /auth/github      // GitHub ile giriş
```

### Veritabanı Şeması

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(32),
    google_id VARCHAR(255),
    github_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Güvenlik Önlemleri

1. **Şifre Politikası**
   - Minimum 8 karakter
   - En az 1 büyük harf
   - En az 1 küçük harf
   - En az 1 rakam
   - En az 1 özel karakter

2. **Rate Limiting**
   - Login endpointi: 5 istek/dakika
   - Register endpointi: 3 istek/dakika
   - 2FA doğrulama: 3 istek/dakika

3. **Token Yönetimi**
   - Access token süresi: 15 dakika
   - Refresh token süresi: 7 gün
   - Token rotasyonu her yenilemede

## Konfigürasyon

```javascript
{
  "server": {
    "port": 3001,
    "cors": {
      "origin": ["https://xcord.app"],
      "methods": ["GET", "POST", "PUT", "DELETE"]
    }
  },
  "jwt": {
    "accessTokenSecret": process.env.JWT_ACCESS_SECRET,
    "refreshTokenSecret": process.env.JWT_REFRESH_SECRET,
    "accessTokenExpiration": "15m",
    "refreshTokenExpiration": "7d"
  },
  "database": {
    "url": process.env.DATABASE_URL,
    "pool": {
      "min": 2,
      "max": 10
    }
  },
  "redis": {
    "url": process.env.REDIS_URL,
    "prefix": "auth:"
  },
  "oauth": {
    "google": {
      "clientId": process.env.GOOGLE_CLIENT_ID,
      "clientSecret": process.env.GOOGLE_CLIENT_SECRET,
      "callbackUrl": process.env.GOOGLE_CALLBACK_URL
    },
    "github": {
      "clientId": process.env.GITHUB_CLIENT_ID,
      "clientSecret": process.env.GITHUB_CLIENT_SECRET,
      "callbackUrl": process.env.GITHUB_CALLBACK_URL
    }
  }
}
```

## Geliştirme Kılavuzu

### Kurulum

```bash
cd backend/auth-service
npm install
```

### Ortam Değişkenleri

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/auth_db
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Test

```bash
# Birim testleri çalıştır
npm run test

# E2E testleri çalıştır
npm run test:e2e

# Test coverage raporu
npm run test:coverage
```

## İzleme ve Metrikler

### Prometheus Metrikleri

- `auth_login_attempts_total`: Toplam giriş denemesi sayısı
- `auth_login_failures_total`: Başarısız giriş denemesi sayısı
- `auth_active_sessions`: Aktif oturum sayısı
- `auth_token_refresh_total`: Token yenileme sayısı

### Loglama

```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## Hata Kodları

| Kod | Açıklama |
|-----|-----------|
| AUTH001 | Geçersiz kimlik bilgileri |
| AUTH002 | Oturum süresi dolmuş |
| AUTH003 | Geçersiz token |
| AUTH004 | 2FA doğrulama başarısız |
| AUTH005 | Rate limit aşıldı |

## Sorun Giderme

### Sık Karşılaşılan Sorunlar

1. **Token Geçersiz Hatası**
   - JWT secret key'lerin doğru ayarlandığını kontrol edin
   - Token süresinin dolup dolmadığını kontrol edin

2. **Veritabanı Bağlantı Hatası**
   - DATABASE_URL'in doğru olduğunu kontrol edin
   - PostgreSQL servisinin çalıştığını kontrol edin

3. **Redis Bağlantı Hatası**
   - REDIS_URL'in doğru olduğunu kontrol edin
   - Redis servisinin çalıştığını kontrol edin