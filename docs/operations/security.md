# Güvenlik Politikaları ve Standartları

## Genel Güvenlik Prensipleri

1. **Defense in Depth**
   - Çok katmanlı güvenlik yaklaşımı
   - Her katmanda güvenlik kontrolleri
   - Sıfır güven (Zero Trust) mimarisi

2. **En Az Yetki Prensibi**
   - Minimum gerekli yetkiler
   - Rol tabanlı erişim kontrolü
   - Düzenli yetki gözden geçirme

3. **Güvenli Varsayılanlar**
   - Güvenli varsayılan konfigürasyonlar
   - Gereksiz servislerin devre dışı bırakılması
   - Güvenli iletişim protokolleri

## Kimlik Doğrulama ve Yetkilendirme

### 1. Kimlik Doğrulama Politikası

```typescript
interface PasswordPolicy {
  minLength: 12;
  requireUppercase: true;
  requireLowercase: true;
  requireNumbers: true;
  requireSpecialChars: true;
  maxAge: 90; // gün
  preventReuse: 5; // son 5 şifre tekrar kullanılamaz
}

interface LoginPolicy {
  maxAttempts: 5;
  lockoutDuration: 15; // dakika
  requireCaptcha: true;
  sessionTimeout: 30; // dakika
}
```

### 2. JWT Güvenliği

```typescript
const jwtConfig = {
  algorithm: 'RS256', // Asimetrik şifreleme
  expiresIn: '15m',  // Access token süresi
  refreshTokenExpiry: '7d', // Refresh token süresi
  issuer: 'xcord.app',
  audience: ['api.xcord.app'],
  jwtid: uuidv4() // Benzersiz token ID
};
```

### 3. İki Faktörlü Kimlik Doğrulama (2FA)

```typescript
interface TwoFactorConfig {
  required: boolean;
  methods: ('authenticator' | 'sms' | 'email')[];
  backupCodes: number;
  gracePerio: number; // saniye
}
```

## API Güvenliği

### 1. Rate Limiting

```javascript
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına maksimum istek
  message: 'Too many requests, please try again later.',
  headers: true,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip;
  }
});
```

### 2. Input Validasyonu

```typescript
// API request validasyonu
const validateUserInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details
      });
    }
    next();
  };
};

// XSS Koruması
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
};
```

### 3. CORS Politikası

```javascript
const corsOptions = {
  origin: ['https://xcord.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400
};
```

## Veri Güvenliği

### 1. Veri Şifreleme

```typescript
interface EncryptionConfig {
  // At-rest şifreleme
  dataEncryption: {
    algorithm: 'AES-256-GCM';
    keyRotationPeriod: 90; // gün
    backupEnabled: true;
  };
  
  // Transport şifreleme
  transportEncryption: {
    tlsVersion: 'TLSv1.3';
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ];
  };
}
```

### 2. Hassas Veri İşleme

```typescript
// Hassas veri maskeleme
const maskSensitiveData = (data: string, type: 'email' | 'phone' | 'card'): string => {
  switch (type) {
    case 'email':
      return data.replace(/(?<=.{3}).(?=.*@)/g, '*');
    case 'phone':
      return data.replace(/(?<=.{3}).(?=.{3})/g, '*');
    case 'card':
      return data.replace(/(?<=.{4}).(?=.{4}$)/g, '*');
  }
};
```

### 3. Veri Saklama ve Silme

```sql
-- Veri saklama politikası
CREATE TABLE data_retention_policies (
    data_type VARCHAR(50) PRIMARY KEY,
    retention_period INTERVAL,
    deletion_strategy VARCHAR(20),
    requires_backup BOOLEAN
);

-- Otomatik veri temizleme
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    DELETE FROM messages 
    WHERE deleted_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM user_sessions 
    WHERE last_activity < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

## Sistem Güvenliği

### 1. Güvenlik Duvarı Kuralları

```bash
# Örnek iptables kuralları
iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -P INPUT DROP
```

### 2. Güvenlik İzleme

```yaml
# Fail2ban yapılandırması
[ssh]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
findtime = 300
bantime = 3600
```

### 3. Günlük Güvenlik Kontrolleri

```bash
# Günlük güvenlik kontrol scripti
#!/bin/bash

# Disk kullanımı kontrolü
df -h | awk '{ if($5 > "80%") print $0 }'

# Açık portların kontrolü
netstat -tuln

# Başarısız giriş denemeleri
grep "Failed password" /var/log/auth.log

# Sistem güncellemeleri kontrolü
apt list --upgradable
```

## İncident Response

### 1. Güvenlik Olayı Yanıt Planı

```typescript
interface SecurityIncident {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  affectedSystems: string[];
  detectionTime: Date;
  responseActions: string[];
  status: 'open' | 'investigating' | 'contained' | 'resolved';
}

const incidentResponse = {
  notification: {
    critical: ['security-team@xcord.app', 'cto@xcord.app'],
    high: ['security-team@xcord.app'],
    medium: ['security-oncall@xcord.app'],
    low: ['security-alerts@xcord.app']
  },
  
  automatedActions: {
    'brute-force': [
      'block-ip',
      'enable-additional-monitoring',
      'notify-security-team'
    ],
    'data-leak': [
      'revoke-affected-tokens',
      'enable-audit-logging',
      'notify-data-protection-officer'
    ]
  }
};
```

### 2. Log Toplama ve Analiz

```javascript
// SIEM entegrasyonu
const syslogTransport = new winston.transports.Syslog({
  host: 'siem.xcord.internal',
  port: 514,
  protocol: 'tls',
  format: winston.format.json(),
  app_name: 'xcord-api',
  eol: '\n'
});

// Güvenlik log formatı
const securityLogFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp']
  })
);
```

## Güvenlik Testleri

### 1. Otomatik Güvenlik Testleri

```yaml
# GitLab CI güvenlik tarama yapılandırması
security-scan:
  stage: test
  script:
    - npm audit
    - snyk test
    - owasp-dependency-check
    - sonarqube-scanner
  artifacts:
    reports:
      security: gl-security-report.json
```

### 2. Penetrasyon Testi Kontrol Listesi

```markdown
## Güvenlik Test Kapsamı

1. Kimlik Doğrulama ve Yetkilendirme
   - [ ] Brute force koruması
   - [ ] Şifre politikası
   - [ ] Session yönetimi
   - [ ] JWT güvenliği

2. API Güvenliği
   - [ ] Input validasyonu
   - [ ] Rate limiting
   - [ ] CORS yapılandırması
   - [ ] API authentication

3. Veri Güvenliği
   - [ ] Transport şifreleme
   - [ ] Depolama şifreleme
   - [ ] Hassas veri işleme
   - [ ] Veri sızıntısı testi
```

## Düzenli Bakım

### 1. Güvenlik Güncellemeleri

```bash
# Güvenlik güncelleme scripti
#!/bin/bash

# Sistem güncellemeleri
apt update
apt upgrade -y

# Node.js bağımlılıkları
npm audit fix

# SSL sertifika kontrolü
certbot renew

# Docker image güncellemeleri
docker images | grep xcord | awk '{print $1}' | xargs -L1 docker pull
```

### 2. Güvenlik Denetimi

```sql
-- Kullanıcı aktivite denetimi
SELECT 
    user_id,
    action,
    ip_address,
    timestamp,
    status
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
AND status = 'failed'
GROUP BY user_id, action, ip_address, timestamp, status
HAVING COUNT(*) > 5;