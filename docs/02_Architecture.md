# XCord Mimari Dokümantasyonu

## Sistem Mimarisine Genel Bakış

XCord platformu, mikroservis mimarisi üzerine inşa edilmiştir. Bu mimari, platformun farklı işlevlerini bağımsız servisler olarak ayırarak geliştirme, dağıtım ve ölçeklendirme süreçlerini kolaylaştırır. XCord'un temel servisleri şunlardır:

- API Gateway
- Authentication Service (Kimlik Doğrulama Servisi)
- Messaging Service (Mesajlaşma Servisi)
- Server Management Service (Sunucu Yönetim Servisi)
- Voice Service (Ses Servisi)

## Servis Mimarisi Detayları

### API Gateway

- **Görevleri:**
    - Platforma gelen tüm istekler için merkezi giriş noktasıdır.
    - İstekleri ilgili servislere yönlendirir ve yük dengeleme yapar.
    - Devre kesici (circuit breaker) deseni uygular, servis hatalarını yönetir.
    - WebSocket bağlantılarını yönetir ve gerçek zamanlı iletişimi destekler.
    - İstek ve yanıt dönüşümlerini gerçekleştirir.

### Authentication Service (Kimlik Doğrulama Servisi)

- **Görevleri:**
    - Kullanıcı kimlik doğrulama ve yetkilendirme işlemlerini yönetir.
    - JWT (JSON Web Token) tabanlı token yönetimi sağlar.
    - Kullanıcı profili yönetimini (oluşturma, güncelleme, silme) gerçekleştirir.
    - Oturum (session) yönetimini ve güvenliğini sağlar.

### Messaging Service (Mesajlaşma Servisi)

- **Görevleri:**
    - Gerçek zamanlı mesaj işlemlerini (gönderme, alma) yönetir.
    - Sohbet odası (kanal) yönetimini sağlar.
    - Mesajların kalıcı olarak saklanmasını yönetir.
    - Yazıyor göstergesi (typing indicators) özelliğini destekler.
    - Okundu bilgisi (read receipts) özelliğini yönetir.
    - Socket bağlantı yönetimini ve mesaj olaylarını (message events) işler.

### Server Management Service (Sunucu Yönetim Servisi)

- **Görevleri:**
    - Sunucu oluşturma ve yönetme işlemlerini (oluşturma, güncelleme, silme) sağlar.
    - Kanal yönetimini (sunucu içindeki kanalları yönetme) gerçekleştirir.
    - Rol tabanlı erişim kontrolü (RBAC) uygular.
    - Sunucu üye yönetimini (ekleme, çıkarma, yetkilendirme) sağlar.
    - Sunucu izinlerini yönetir.

### Voice Service (Ses Servisi)

- **Görevleri:**
    - Ses kanalı yönetimini (oluşturma, yönetme) sağlar.
    - Gerçek zamanlı sesli iletişimi yönetir.
    - Ses kalitesi izleme ve iyileştirme süreçlerini yönetir.

## Olay (Event) Sistemi

XCord platformu, servisler arası iletişimi ve asenkron işlemleri yönetmek için olay güdümlü bir mimari kullanır.

### Olay Tipleri (Event Types)

```typescript
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
}
```

### Olay Veriyolu (Event Bus)

- **Görevleri:**
    - Servisler arası iletişimi yönetir.
    - Yayınla/abone ol (publish/subscribe) modelini uygular.
    - Olayların güvenilir bir şekilde teslimini ve yeniden deneme (retry) mekanizmalarını yönetir.
    - Başarısız olaylar için ölü mektup kuyruğu (dead letter queue) sağlar.

## Veri Depolama

### PostgreSQL Veritabanları

- **Kullanım Alanları:**
    - Kullanıcı verileri (Authentication Service)
    - Sunucu ve kanal verileri (Server Management Service)
    - Mesajlar ve sohbet odaları (Messaging Service)

### Redis

- **Kullanım Alanları:**
    - Oturum (session) yönetimi
    - Gerçek zamanlı varlık (presence) takibi
    - Geçici veri önbellekleme (temporary data caching)
    - Socket kullanıcı takibi

## WebSocket Mimarisi

### Socket Yöneticisi (Socket Manager)

- **Görevleri:**
    - Gerçek zamanlı bağlantıları yönetir.
    - Kullanıcı varlığını (presence) yönetir.
    - Oda tabanlı mesajlaşma (room-based messaging) uygular.
    - Yazıyor göstergesi (typing indicators) özelliğini yönetir.
    - Bağlantı durumunu (connection state) yönetir.

### Gerçek Zamanlı Özellikler (Real-time Features)

- Mesaj teslimatı (message delivery)
- Yazıyor göstergesi (typing indicators)
- Çevrimiçi/çevrimdışı durumu (online/offline status)
- Okundu bilgisi (read receipts)
- Ses kanalı durumu (voice channel status)

## Güvenlik

### Kimlik Doğrulama (Authentication)

- JWT tabanlı kimlik doğrulama
- Rol tabanlı erişim kontrolü (RBAC)
- Oturum (session) yönetimi
- Token yenileme mekanizması (token refresh mechanism)

### İstek Doğrulama (Request Validation)

- Giriş doğrulama ara yazılımı (input validation middleware)
- Şema doğrulama (schema validation)
- İzin kontrolü (permission checking)
- Hız sınırlama (rate limiting)

## İzleme ve Gözlemlenebilirlik (Monitoring and Observability)

### Metrikler (Metrics)

- Servis sağlık izleme (service health monitoring)
- Performans metrikleri (performance metrics)
- Hata oranı takibi (error rate tracking)
- Kullanıcı aktivite izleme (user activity monitoring)

### İzleme (Tracing)

- Servisler arası istek izleme (request tracing across services)
- Hata takibi (error tracking)
- Performans darboğazı (performance bottleneck) tespiti
- Dağıtık izleme (distributed tracing)

## Dağıtım (Deployment)

### Docker Konteynerleri (Docker Containers)

- Servis konteynerleştirme (service containerization)
- Ortam yapılandırması (environment configuration)
- Kaynak yönetimi (resource management)

### Kubernetes

- Konteyner orkestrasyonu (container orchestration)
- Servis ölçeklendirme (service scaling)
- Yük dengeleme (load balancing)
- Sağlık izleme (health monitoring)
- Kademeli güncellemeler (rolling updates)
