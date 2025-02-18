# API Dokümantasyon Kılavuzu

## Genel Prensipler

1. **Tutarlılık**
   - Tüm API'ler için tutarlı format kullanın
   - Standart HTTP metodlarını kullanın
   - Tutarlı yanıt formatları sağlayın
   - Versiyon kontrolü uygulayın

2. **Açıklık**
   - Her endpoint'i detaylı açıklayın
   - İstek ve yanıt örnekleri ekleyin
   - Hata durumlarını belgeleyin
   - Gerekli parametreleri belirtin

## OpenAPI/Swagger Şeması

```yaml
openapi: 3.0.0
info:
  title: XCord API
  version: '1.0.0'
  description: XCord platformu REST API dokümantasyonu

servers:
  - url: https://api.xcord.app/v1
    description: Production API
  - url: https://staging-api.xcord.app/v1
    description: Staging API

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        details:
          type: object

paths:
  /auth/login:
    post:
      summary: Kullanıcı girişi
      description: Email ve şifre ile kullanıcı girişi yapar
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  format: password
      responses:
        '200':
          description: Başarılı giriş
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    type: object
                    properties:
                      id:
                        type: string
                      username:
                        type: string
        '401':
          description: Geçersiz kimlik bilgileri
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

## API Endpoint Dokümantasyonu

### Endpoint Şablonu

```markdown
## Endpoint Adı

Endpoint'in kısa açıklaması.

### HTTP Metodu ve URL
`POST /api/v1/resource`

### Yetkilendirme
- Gerekli: Evet/Hayır
- Tip: Bearer Token
- İzinler: `PERMISSION_NAME`

### İstek (Request)

#### Headers
| İsim | Gerekli | Açıklama |
|------|----------|-----------|
| Authorization | Evet | Bearer token |
| Content-Type | Evet | application/json |

#### Body
```json
{
  "field1": "string",
  "field2": number,
  "field3": {
    "nested": "value"
  }
}
```

#### Parametreler
| İsim | Tip | Gerekli | Açıklama |
|------|-----|----------|-----------|
| field1 | string | Evet | Alan açıklaması |
| field2 | number | Hayır | Alan açıklaması |
| field3.nested | string | Evet | Alan açıklaması |

### Yanıt (Response)

#### Başarılı Yanıt (200 OK)
```json
{
  "id": "uuid",
  "field1": "value",
  "createdAt": "2025-02-18T04:42:00Z"
}
```

#### Hata Yanıtları
| Kod | Açıklama |
|-----|-----------|
| 400 | Geçersiz istek |
| 401 | Yetkisiz erişim |
| 403 | Erişim reddedildi |
| 404 | Kaynak bulunamadı |

### Örnek Kullanım

#### cURL
```bash
curl -X POST https://api.xcord.app/v1/resource \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"field1": "value"}'
```

#### JavaScript (Fetch)
```javascript
const response = await fetch('https://api.xcord.app/v1/resource', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    field1: 'value'
  })
});
```
```

## API Versiyon Yönetimi

### URL Versiyonlama

```
https://api.xcord.app/v1/resource
https://api.xcord.app/v2/resource
```

### Header Versiyonlama

```http
Accept: application/vnd.xcord.v1+json
Accept: application/vnd.xcord.v2+json
```

## Hata Yanıtları

### Standart Hata Formatı

```json
{
  "code": "ERROR_CODE",
  "message": "İnsan tarafından okunabilir hata mesajı",
  "details": {
    "field": "Spesifik alan hatası"
  }
}
```

### Yaygın Hata Kodları

| Kod | Açıklama |
|-----|-----------|
| AUTH001 | Geçersiz kimlik bilgileri |
| AUTH002 | Token süresi dolmuş |
| VAL001 | Geçersiz veri formatı |
| VAL002 | Zorunlu alan eksik |
| RATE001 | Rate limit aşıldı |

## WebSocket API

### Bağlantı

```javascript
const socket = new WebSocket('wss://ws.xcord.app/v1');

socket.onopen = () => {
  socket.send(JSON.stringify({
    type: 'auth',
    token: 'your-token'
  }));
};
```

### Event Formatı

```typescript
interface SocketEvent {
  type: string;
  data: any;
  timestamp: string;
}
```

### Event Tipleri

| Tip | Yön | Açıklama |
|-----|-----|-----------|
| auth | C→S | Bağlantı doğrulama |
| message | C↔S | Mesaj gönderme/alma |
| presence | S→C | Kullanıcı durum değişikliği |
| typing | C↔S | Yazıyor göstergesi |

## Rate Limiting

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1582162878
```

### Limitler

| Endpoint | Metod | Limit | Periyot |
|----------|-------|-------|----------|
| /messages | POST | 120 | 1 dakika |
| /files/upload | POST | 10 | 1 dakika |
| /search | GET | 30 | 1 dakika |

## Güvenlik

### Yetkilendirme

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### CORS Yapılandırması

```javascript
app.use(cors({
  origin: ['https://xcord.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));
```

## İzleme ve Metrikler

### Response Headers

```http
X-Response-Time: 42ms
X-Request-ID: req_7bac6h4k2l
```

### Prometheus Metrikleri

```javascript
const metrics = {
  requestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP isteği süre dağılımı',
    labelNames: ['method', 'route', 'status_code']
  }),
  
  requestTotal: new Counter({
    name: 'http_requests_total',
    help: 'Toplam HTTP isteği sayısı',
    labelNames: ['method', 'route']
  })
};