# Mesajlaşma Servisi (Messaging Service)

## Genel Bakış

Messaging Service, XCord platformunun gerçek zamanlı mesajlaşma özelliklerini sağlayan temel servisidir. WebSocket teknolojisi kullanarak anlık mesajlaşma, durum güncellemeleri ve bildirimler gibi özellikleri yönetir.

## Özellikler

- Gerçek zamanlı mesajlaşma
- Kanal tabanlı iletişim
- Direkt mesajlaşma
- Medya paylaşımı
- Mesaj geçmişi
- Okundu bildirimleri
- Yazıyor göstergesi
- Çevrimiçi durum takibi

## Teknik Detaylar

### WebSocket Events

```typescript
// Client -> Server
interface ClientEvents {
  'message:send': (data: {
    content: string;
    channelId: string;
    attachments?: Array<{
      type: 'image' | 'video' | 'file';
      url: string;
    }>;
  }) => void;
  
  'typing:start': (data: {
    channelId: string;
  }) => void;
  
  'typing:stop': (data: {
    channelId: string;
  }) => void;
}

// Server -> Client
interface ServerEvents {
  'message:received': (message: Message) => void;
  'message:updated': (message: Message) => void;
  'message:deleted': (messageId: string) => void;
  'typing:update': (data: {
    channelId: string;
    users: Array<{
      id: string;
      username: string;
    }>;
  }) => void;
}
```

### Veritabanı Şeması

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    channel_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT,
    type VARCHAR(20) DEFAULT 'text',
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE message_reads (
    message_id UUID REFERENCES messages(id),
    user_id UUID NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id)
);
```

### Redis Veri Yapıları

```javascript
// Çevrimiçi kullanıcılar
key: 'online:users'
type: SET
members: [userId1, userId2, ...]

// Yazıyor durumu
key: 'typing:channel:{channelId}'
type: HASH
field: userId
value: timestamp

// Mesaj önbelleği
key: 'messages:channel:{channelId}'
type: LIST
values: [messageJson1, messageJson2, ...]
```

## Performans Optimizasyonları

### Mesaj Önbellekleme

```javascript
class MessageCache {
  async get(channelId) {
    const cached = await redis.lrange(`messages:channel:${channelId}`, 0, -1);
    if (cached.length) {
      return cached.map(JSON.parse);
    }
    
    const messages = await db.messages.findRecent(channelId);
    await this.set(channelId, messages);
    return messages;
  }

  async set(channelId, messages) {
    const multi = redis.multi();
    multi.del(`messages:channel:${channelId}`);
    messages.forEach(msg => 
      multi.rpush(`messages:channel:${channelId}`, JSON.stringify(msg))
    );
    multi.expire(`messages:channel:${channelId}`, 3600); // 1 saat TTL
    await multi.exec();
  }
}
```

### Socket.IO Yapılandırması

```javascript
const io = new Server({
  pingTimeout: 10000,
  pingInterval: 5000,
  transports: ['websocket'],
  path: '/socket.io',
  adapter: createAdapter(redisClient),
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});
```

## Güvenlik Önlemleri

### Rate Limiting

```javascript
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 120, // dakikada maksimum 120 mesaj
  message: 'Çok fazla mesaj gönderdiniz, lütfen bekleyin.'
});

const fileUploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // dakikada maksimum 10 dosya
  message: 'Çok fazla dosya yüklediniz, lütfen bekleyin.'
});
```

### İçerik Filtreleme

```javascript
const messageFilter = {
  check(content) {
    // Spam kontrol
    if (this.isSpam(content)) return false;
    
    // Yasaklı kelime kontrolü
    if (this.containsBannedWords(content)) return false;
    
    // Link güvenlik kontrolü
    if (this.hasUnsafeLinks(content)) return false;
    
    return true;
  }
};
```

## İzleme ve Metrikler

### Prometheus Metrikleri

```javascript
const metrics = {
  messagesSent: new Counter({
    name: 'messages_sent_total',
    help: 'Gönderilen toplam mesaj sayısı'
  }),
  
  messageLength: new Histogram({
    name: 'message_length_bytes',
    help: 'Mesaj boyutu dağılımı',
    buckets: [64, 256, 1024, 4096]
  }),
  
  onlineUsers: new Gauge({
    name: 'online_users_total',
    help: 'Anlık çevrimiçi kullanıcı sayısı'
  })
};
```

### Loglama

```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'messaging-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## Geliştirme Kılavuzu

### Kurulum

```bash
cd backend/messaging-service
npm install
```

### Ortam Değişkenleri

```env
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://user:pass@localhost:5432/messaging_db
REDIS_URL=redis://localhost:6379
AUTH_SERVICE_URL=http://localhost:3001
```

### Test

```bash
# Birim testleri çalıştır
npm run test

# WebSocket testleri
npm run test:ws

# Yük testleri
npm run test:load
```

## Sorun Giderme

### Sık Karşılaşılan Sorunlar

1. **WebSocket Bağlantı Hataları**
   - Ağ bağlantısını kontrol edin
   - CORS ayarlarını kontrol edin
   - Token geçerliliğini kontrol edin

2. **Mesaj İletim Gecikmeleri**
   - Redis bağlantısını kontrol edin
   - Sistemin yük durumunu kontrol edin
   - Network gecikmelerini kontrol edin

3. **Önbellek Tutarsızlıkları**
   - Redis durumunu kontrol edin
   - Önbellek TTL ayarlarını kontrol edin
   - Veritabanı ile senkronizasyonu kontrol edin