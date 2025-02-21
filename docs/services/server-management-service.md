# Sunucu Yönetim Servisi (Server Management Service)

## Genel Bakış

Server Management Service, XCord platformundaki sunucuların, kanalların ve üyeliklerin yönetiminden sorumlu servistir. Sunucu oluşturma, düzenleme, silme, kanal yönetimi, üye yönetimi ve izin sistemini kontrol eder.

## Özellikler

- Sunucu CRUD operasyonları
- Kanal yönetimi
- Rol tabanlı yetkilendirme sistemi
- Üye yönetimi
- İzin sistemi
- Sunucu şablonları
- Davet sistemi
- Sunucu istatistikleri

## Teknik Detaylar

### Veritabanı Konfigürasyonu

Servis, PostgreSQL veritabanını kullanmaktadır. Bağlantı yönetimi için connection pool kullanılır ve bağlantı hataları durumunda otomatik yeniden deneme mekanizması bulunmaktadır.

```typescript
// Veritabanı bağlantı ayarları
const dbConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'server_management',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Bağlantı yeniden deneme stratejisi
- Maksimum deneme sayısı: 5
- Denemeler arası bekleme süresi: 5 saniye
- Hata durumunda loglama ve izleme
```

### Veritabanı Şeması

```sql
-- Sunucular
CREATE TABLE servers (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id UUID NOT NULL,
    icon_url TEXT,
    banner_url TEXT,
    region VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    member_count INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 100000
);

-- Kanallar
CREATE TABLE channels (
    id UUID PRIMARY KEY,
    server_id UUID REFERENCES servers(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- text, voice, announcement
    position INTEGER,
    topic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parent_id UUID REFERENCES channels(id)
);

-- Roller
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    server_id UUID REFERENCES servers(id),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    position INTEGER,
    permissions BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Üyeler
CREATE TABLE server_members (
    server_id UUID REFERENCES servers(id),
    user_id UUID NOT NULL,
    nickname VARCHAR(32),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, user_id)
);

-- Üye Rolleri
CREATE TABLE member_roles (
    server_id UUID REFERENCES servers(id),
    user_id UUID NOT NULL,
    role_id UUID REFERENCES roles(id),
    PRIMARY KEY (server_id, user_id, role_id)
);
```

### İzin Sistemi

```typescript
// İzin bitleri
const Permissions = {
  ADMINISTRATOR: 1n << 0n,
  MANAGE_SERVER: 1n << 1n,
  MANAGE_CHANNELS: 1n << 2n,
  MANAGE_ROLES: 1n << 3n,
  MANAGE_MESSAGES: 1n << 4n,
  KICK_MEMBERS: 1n << 5n,
  BAN_MEMBERS: 1n << 6n,
  CREATE_INVITES: 1n << 7n,
  CHANGE_NICKNAME: 1n << 8n,
  MANAGE_NICKNAMES: 1n << 9n,
  VIEW_CHANNELS: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  ATTACH_FILES: 1n << 12n,
  CONNECT: 1n << 13n,
  SPEAK: 1n << 14n,
  MUTE_MEMBERS: 1n << 15n,
  DEAFEN_MEMBERS: 1n << 16n,
  MOVE_MEMBERS: 1n << 17n
};

class PermissionManager {
  hasPermission(memberPermissions: bigint, permission: bigint): boolean {
    // Yönetici her zaman true döner
    if ((memberPermissions & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) {
      return true;
    }
    return (memberPermissions & permission) === permission;
  }

  calculateMemberPermissions(member: ServerMember, roles: Role[]): bigint {
    let permissions = 0n;
    
    // Rollerin izinlerini birleştir
    for (const role of roles) {
      permissions |= BigInt(role.permissions);
    }
    
    return permissions;
  }
}
```

### API Endpoints

```typescript
interface ServerAPI {
  // Sunucu Yönetimi
  'POST   /servers':                 'Yeni sunucu oluştur',
  'GET    /servers':                 'Kullanıcının sunucularını listele',
  'GET    /servers/:id':             'Sunucu detaylarını getir',
  'PATCH  /servers/:id':             'Sunucu ayarlarını güncelle',
  'DELETE /servers/:id':             'Sunucuyu sil',
  
  // Kanal Yönetimi
  'POST   /servers/:id/channels':    'Yeni kanal oluştur',
  'GET    /servers/:id/channels':    'Sunucu kanallarını listele',
  'PATCH  /channels/:id':            'Kanal ayarlarını güncelle',
  'DELETE /channels/:id':            'Kanalı sil',
  
  // Üye Yönetimi
  'GET    /servers/:id/members':     'Sunucu üyelerini listele',
  'PUT    /servers/:id/members/:uid': 'Üye rollerini güncelle',
  'DELETE /servers/:id/members/:uid': 'Üyeyi sunucudan çıkar',
  
  // Rol Yönetimi
  'POST   /servers/:id/roles':       'Yeni rol oluştur',
  'GET    /servers/:id/roles':       'Sunucu rollerini listele',
  'PATCH  /roles/:id':               'Rol ayarlarını güncelle',
  'DELETE /roles/:id':               'Rolü sil'
}
```

## Önbellekleme Stratejisi

### Redis Veri Yapıları

```javascript
// Sunucu önbelleği
key: 'server:{serverId}'
type: HASH
fields: {
  name, icon_url, banner_url, region,
  member_count, ...serverData
}

// Kanal listesi önbelleği
key: 'server:{serverId}:channels'
type: LIST
values: [channelJson1, channelJson2, ...]

// Rol önbelleği
key: 'server:{serverId}:roles'
type: HASH
fields: {roleId: roleJson}

// Üye rolleri önbelleği
key: 'server:{serverId}:member:{userId}:roles'
type: SET
members: [roleId1, roleId2, ...]
```

## İzleme ve Metrikler

### Prometheus Metrikleri

```javascript
const metrics = {
  serverCount: new Gauge({
    name: 'server_count_total',
    help: 'Toplam sunucu sayısı'
  }),
  
  channelsPerServer: new Histogram({
    name: 'channels_per_server',
    help: 'Sunucu başına kanal sayısı dağılımı',
    buckets: [5, 10, 20, 50, 100]
  }),
  
  membersPerServer: new Histogram({
    name: 'members_per_server',
    help: 'Sunucu başına üye sayısı dağılımı',
    buckets: [10, 50, 100, 500, 1000, 5000]
  })
};
```

## Geliştirme Kılavuzu

### Kurulum

```bash
cd backend/server-management-service
npm install
```

### Ortam Değişkenleri

```env
NODE_ENV=development
PORT=3004
DATABASE_URL=postgresql://user:pass@localhost:5432/server_db
REDIS_URL=redis://localhost:6379
AUTH_SERVICE_URL=http://localhost:3001
```

### Test

```bash
# Birim testleri çalıştır
npm run test

# Entegrasyon testleri
npm run test:integration

# Veritabanı testleri
npm run test:db
```

## Sorun Giderme

### Sık Karşılaşılan Sorunlar

1. **İzin Hataları**
   - Rol hiyerarşisini kontrol edin
   - İzin hesaplamasını doğrulayın
   - Rol önbelleğinin güncel olduğunu kontrol edin

2. **Önbellek Tutarsızlıkları**
   - Redis bağlantısını kontrol edin
   - Önbellek invalidasyon mantığını kontrol edin
   - Veritabanı ile senkronizasyonu doğrulayın

3. **Performans Sorunları**
   - İndeksleri kontrol edin
   - Sorgu optimizasyonlarını gözden geçirin
   - Önbellek hit/miss oranlarını kontrol edin

### Performans İyileştirme İpuçları

1. **Veritabanı Optimizasyonu**
   - Yaygın sorgular için indeksler ekleyin
   - Büyük tabloları partition'layın
   - Sorgu planlarını analiz edin

2. **Önbellek Stratejisi**
   - Sık erişilen verileri önbelleğe alın
   - Önbellek TTL'lerini optimize edin
   - Önbellek invalidasyon stratejisini gözden geçirin

3. **Ölçeklendirme**
   - Read replica'lar ekleyin
   - Sharding stratejisi belirleyin
   - Yük dengeleme yapılandırın