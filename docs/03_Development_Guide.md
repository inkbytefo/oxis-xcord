# Geliştirme Kılavuzu

## Proje Yapısı

```
services/
├── api-gateway/
├── auth-service/
├── messaging-service/
├── server-management/
├── shared/
└── voice-service/
```

## Servis Geliştirme İlkeleri

### Ortak Kütüphane Kullanımı

`services/shared` dizini, servisler arası ortak yardımcı araçları ve tipleri içerir:

```typescript
// Olay Tipleri
const EventTypes = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_READ: 'MESSAGE_READ',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  SERVER_CREATED: 'SERVER_CREATED',
  SERVER_UPDATED: 'SERVER_UPDATED',
  SERVER_DELETED: 'SERVER_DELETED',
  VOICE_CALL_STARTED: 'VOICE_CALL_STARTED',
  VOICE_CALL_ENDED: 'VOICE_CALL_ENDED'
};

// Olay Arayüzü
interface Event {
  type: EventType;
  data: EventDataMap[EventType];
  metadata: {
    timestamp: string;
    correlationId: string;
    source: string;
  };
}
```

### Olay Veriyolu Uygulaması

Servisler arası iletişim için ortak kütüphaneden `EventBus` kullanın:

```typescript
import { EventBus, EventTypes, Event } from '@xcord/shared';

const eventBus = EventBus.getInstance(config.rabbitmq.url);

// Olay yayınlama
await eventBus.publish({
  type: 'MESSAGE_SENT',
  data: {
    id: messageId,
    senderId: userId,
    content: message
  },
  metadata: {
    timestamp: new Date().toISOString(),
    correlationId: uuidv4(),
    source: 'messaging-service'
  }
});

// Olaylara abone olma
eventBus.subscribe('USER_DELETED', async (event: Event) => {
  // Olayı işle
}, 'service-name-events');
```

### WebSocket Uygulaması

Socket yöneticisi uygulama deseni:

```typescript
class SocketManager {
  private io: Server;
  private connectedSockets: Map<string, Socket>;

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      // Socket bağlantısını doğrula
      try {
        const token = socket.handshake.auth.token;
        // Token'ı doğrula
        next();
      } catch (error) {
        next(new Error('Kimlik doğrulama başarısız'));
      }
    });
  }

  public async handleConnection(socket: Socket): Promise<void> {
    // Yeni bağlantıları işle
    socket.on('message:send', (data) => this.handleMessage(socket, data));
    socket.on('typing:start', (data) => this.handleTypingStart(socket, data));
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }
}
```

### İstek Doğrulama

Giriş doğrulaması için `validate-request` ara yazılımını kullanın:

```typescript
import { body, param, validationResult } from 'express-validator';

const validateRequest = [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### Veritabanı Modelleri

Varlık tanımlama deseni:

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Server {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  ownerId: string;

  @Column('jsonb', { default: [] })
  members: string[];
}
```

### Hata Yönetimi

Standart hata yönetimi deseni:

```typescript
try {
  // İşlem mantığı
} catch (error) {
  logger.error({ error }, 'İşlem başarısız oldu');
  if (error instanceof CustomError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  res.status(500).json({ message: 'İç sunucu hatası' });
}
```

## Ortam Yapılandırması

Her servis için bir yapılandırma modülü olmalıdır:

```typescript
export const config = {
  server: {
    port: process.env.PORT || 3000
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h'
  }
};
```

## Test Kılavuzları

### Birim Testleri

```typescript
describe('Mesaj Servisi', () => {
  it('yeni bir mesaj oluşturmalı', async () => {
    const message = await createMessage({
      content: 'Test mesajı',
      senderId: 'user1',
      roomId: 'room1'
    });
    expect(message).toHaveProperty('id');
    expect(message.content).toBe('Test mesajı');
  });
});
```

### Entegrasyon Testleri

```typescript
describe('Kimlik Doğrulama Akışı', () => {
  it('kullanıcıyı doğrulamalı ve token döndürmeli', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

## Geliştirme İş Akışı

1. Ana daldan özellik dalı oluşturun
2. Yukarıdaki desenleri izleyerek değişiklikleri uygulayın
3. Yeni işlevsellik için testler yazın
4. Gerekirse dokümantasyonu güncelleyin
5. Çekme isteği gönderin
6. Kod incelemesi
7. Ana dala birleştirin

## İzleme ve Günlük Kaydı

pino kullanarak günlük kaydı uygulayın:

```typescript
const logger = pino({
  name: 'service-name',
  level: process.env.LOG_LEVEL || 'info'
});

logger.info({ userId, action }, 'Kullanıcı eylemi gerçekleştirildi');
logger.error({ error }, 'İşlem başarısız oldu');
```

## Performans Dikkat Edilmesi Gerekenler

1. Veritabanları için bağlantı havuzu kullanın
2. Uygun yerlerde önbellekleme uygulayın
3. Oturum ve gerçek zamanlı veriler için Redis kullanın
4. Büyük veri kümeleri için sayfalama uygulayın
5. Veritabanlarında uygun indeksler kullanın

## Güvenlik En İyi Uygulamaları

1. Her zaman kullanıcı girişini doğrulayın
2. Kimlik doğrulama için JWT kullanın
3. Hız sınırlaması uygulayın
4. Tüm bağlantılar için HTTPS/WSS kullanın
5. En az ayrıcalık ilkesini izleyin
6. Depolama veya görüntülemeden önce tüm verileri temizleyin
7. Bağımlılıkları güncel tutun
