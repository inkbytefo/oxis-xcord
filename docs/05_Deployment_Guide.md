# XCord Dağıtım Kılavuzu

## Dağıtım Ortamları

### 1. Geliştirme Ortamı (Development)

- **Amaç:** Uygulama geliştirme ve birim testleri için kullanılan ortam.
- **Özellikler:**
    - Debug modu aktiftir.
    - Hot-reload (anında yenileme) özelliği etkindir.
    - Test veritabanları kullanılır.
    - Mock servisler (sahte servisler) kullanılabilir.

### 2. Staging Ortamı

- **Amaç:** Production (canlı) ortam öncesi son testler ve doğrulama için kullanılan ortam.
- **Özellikler:**
    - Production ortamına benzer konfigürasyon kullanılır.
    - Test verisi ile entegrasyon testleri yapılır.
    - Performans izleme araçları aktiftir.
    - Güvenlik testleri bu ortamda gerçekleştirilir.

### 3. Production Ortamı

- **Amaç:** Son kullanıcıların uygulamaya eriştiği canlı ortam.
- **Özellikler:**
    - Yüksek erişilebilirlik (high availability) gereksinimleri karşılanır.
    - Otomatik ölçeklendirme (auto-scaling) mekanizmaları aktiftir.
    - Tam yedekleme (full backup) ve kurtarma stratejileri uygulanır.
    - 7/24 kesintisiz izleme (monitoring) yapılır.

## Dağıtım Mimarisi

### 1. Konteyner Orkestrasyonu

XCord, konteyner tabanlı bir uygulama olup, Docker ve Kubernetes gibi teknolojilerle dağıtılır.

```yaml
# docker-compose.yml örneği
version: '3.8'
services:
  frontend:
    image: xcord/frontend:${VERSION}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production

  backend:
    image: xcord/backend:${VERSION}
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=${DB_URL}
```

### 2. Kubernetes Yapılandırması

Kubernetes, konteyner orkestrasyonu için kullanılır ve uygulama ölçeklendirme, yük dengeleme ve yönetimini kolaylaştırır.

```yaml
# deployment.yml örneği
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xcord-app
spec:
  replicas: 3 # Uygulama replika sayısı
  selector:
    matchLabels:
      app: xcord
  template:
    metadata:
      labels:
        app: xcord
    spec:
      containers:
      - name: xcord
        image: xcord/app:latest
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
```

## Sürekli Entegrasyon/Sürekli Dağıtım (CI/CD) Pipeline

### 1. GitLab CI/CD Pipeline Örneği

GitLab CI/CD, otomatik test, build ve dağıtım süreçlerini yönetmek için kullanılır.

```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm install
    - npm run test

build:
  stage: build
  script:
    - docker build -t xcord/app:${CI_COMMIT_SHA} .

deploy:
  stage: deploy
  script:
    - kubectl apply -f k8s/
```

### 2. Dağıtım Stratejileri

- **Rolling Update (Kademeli Güncelleme):**
    - Uygulama versiyon güncellemeleri sırasında sıfır kesinti (zero-downtime) sağlar.
    - Kademeli olarak yeni versiyon devreye alınır, eski versiyonlar aşamalı olarak kapatılır.
    - Otomatik geri alma (rollback) özelliği bulunur.
    - Sağlık kontrolü (health check) mekanizmaları ile entegredir.

- **Blue/Green Deployment (Mavi/Yeşil Dağıtım):**
    - İki özdeş ortam (mavi ve yeşil) kullanılır.
    - Yeni versiyon, aktif olmayan ortama (yeşil) dağıtılır ve test edilir.
    - Testler başarılı olduğunda, trafik anında yeni ortama (yeşil) yönlendirilir.
    - Hızlı geri alma (rollback) imkanı sunar.
    - Risk minimizasyonu için idealdir.

- **Canary Releases (Kanarya Yayınları):**
    - Yeni versiyon, kullanıcı trafiğinin sadece bir bölümüne (kanarya) yönlendirilir.
    - Yeni versiyonun performansı ve kararlılığı gerçek kullanıcılar üzerinde izlenir.
    - Risk yönetimi ve aşamalı geçiş için kullanılır.
    - A/B testing ve feature flagging (özellik bayrakları) ile entegre edilebilir.

## İzleme ve Günlük Kaydı (Monitoring & Logging)

### 1. Logging Yapılandırması

Winston gibi logging kütüphaneleri ile yapılandırılmış günlükleme sistemi, uygulama davranışlarını izlemek için önemlidir.

```typescript
// Winston logger konfigürasyonu
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'xcord-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 2. Monitoring Araçları

- Prometheus: Metrik toplama ve izleme sistemi.
- Grafana: Veri görselleştirme ve dashboard oluşturma aracı.
- ELK Stack (Elasticsearch, Logstash, Kibana): Merkezi günlük yönetimi ve analizi.
- Jaeger: Dağıtık tracing sistemi.

### 3. Uyarı Sistemi (Alerting)

- CPU/Memory kullanım uyarıları
- Hata oranı (error rate) izleme ve uyarıları
- Yanıt süresi (response time) uyarıları
- İş metrikleri (business metrics) uyarıları

## Veritabanı Yönetimi

### 1. Migration Stratejisi

Veritabanı şema değişikliklerini yönetmek için migration araçları kullanılır.

```sql
-- Migration örneği (SQL)
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Yedekleme Planı (Backup Plan)

- Günlük tam yedekleme (daily full backup)
- Saatlik incremental yedekleme (hourly incremental backup)
- Cross-region replikasyon (bölgeler arası yedekleme)
- Düzenli restore testleri (yedekleme geri yükleme testleri)

## Güvenlik Önlemleri

### 1. SSL/TLS Yapılandırması

HTTPS ve WSS (WebSocket Secure) bağlantıları için SSL/TLS yapılandırması zorunludur.

```nginx
# NGINX SSL yapılandırması örneği
server {
  listen 443 ssl http2;
  server_name xcord.app;

  ssl_certificate /etc/nginx/ssl/xcord.crt;
  ssl_certificate_key /etc/nginx/ssl/xcord.key;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
}
```

### 2. Güvenlik Başlıkları (Security Headers)

HTTP güvenlik başlıkları, web uygulamasının güvenliğini artırmak için kullanılır.

```typescript
// Security middleware (Express.js örneği)
app.use(helmet()); // Güvenlik başlıkları
app.use(cors());   // CORS yapılandırması
app.use(rateLimit({ // Hız sınırlama
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100             // 15 dakika içinde maksimum istek sayısı
}));
```

## Performans Optimizasyonu

### 1. Caching Stratejisi

- Redis: Veritabanı ve uygulama seviyesinde önbellekleme için.
- Browser Caching: Statik varlıklar için tarayıcı önbelleklemesi.
- CDN (Content Delivery Network): Statik içerik dağıtımı ve önbellekleme.
- Object Caching: Nesne seviyesinde önbellekleme.

### 2. Yük Dengeleme (Load Balancing)

- NGINX Load Balancer: HTTP trafiği için yük dengeleme.
- Kubernetes Service: Servisler arası yük dengeleme.
- Geographic Distribution: Coğrafi olarak dağıtılmış yük dengeleme.
- Session Affinity: Oturum sürekliliği için yük dengeleme.

## Felaket Kurtarma (Disaster Recovery)

### 1. Yedekleme Stratejisi

- Otomatik yedeklemeler (automated backups)
- Geo-redundant storage (coğrafi yedekli depolama)
- Point-in-time recovery (zamana bağlı kurtarma)
- Backup verification (yedekleme doğrulama)

### 2. Failover Planı

- Otomatik failover (otomatik yedek sisteme geçiş)
- Multi-region deployment (çok bölgeli dağıtım)
- Data sync stratejisi (veri senkronizasyon stratejisi)
- Recovery Time Objectives (RTO - kurtarma zamanı hedefleri)

## Ortam Değişkenleri (Environment Variables)

### 1. Production Ortamı Örneği

```env
NODE_ENV=production
DATABASE_URL=postgres://user:password@host:5432/db
REDIS_URL=redis://host:6379
API_KEY=your_api_key
```

### 2. Secret Yönetimi (Secrets Management)

Hassas bilgilerin (API anahtarları, veritabanı şifreleri vb.) güvenli yönetimi için:

- Kubernetes Secrets
- HashiCorp Vault
- AWS KMS (Key Management Service)
- Environment encryption (ortam değişkeni şifreleme)

## Dağıtım Kontrol Listesi (Deployment Checklist)

### 1. Dağıtım Öncesi (Pre-deployment)

- [ ] Tüm testler başarılı
- [ ] Güvenlik taraması tamamlandı
- [ ] Performans testleri geçti
- [ ] Dokümantasyon güncel
- [ ] Veritabanı migration'ları hazır

### 2. Dağıtım Sırası (Deployment)

- [ ] Veritabanı yedeği alındı
- [ ] Servisler scale down (düşürüldü)
- [ ] Yeni versiyon dağıtıldı
- [ ] Servisler scale up (artırıldı)
- [ ] Sağlık kontrolleri başarılı

### 3. Dağıtım Sonrası (Post-deployment)

- [ ] Monitoring aktif
- [ ] Uyarılar (alerts) yapılandırıldı
- [ ] Metrikler normal seviyede
- [ ] Kullanıcı geri bildirimleri olumlu
- [ ] Hata (error) artışı yok

## Geri Alma Planı (Rollback Plan)

### 1. Otomatik Geri Alma

- Hata eşik izleme (error threshold monitoring)
- Otomatik versiyon değiştirme (automated version switching)
- Veri tutarlılık kontrolleri (data consistency checks)
- Servis sağlık doğrulama (service health validation)

### 2. Manuel Geri Alma

- Önceki versiyonu geri yükleme (previous version restore)
- Veri kurtarma adımları (data recovery steps)
- Servis yeniden başlatma prosedürü (service restart procedure)
- Kullanıcı iletişim planı (user communication plan)

## Bakım (Maintenance)

### 1. Planlı Bakım (Scheduled Maintenance)

- Update windows (güncelleme zaman aralıkları)
- Kullanıcı bilgilendirme (user notification)
- Servis düşüşü (service degradation)
- Downtime minimizasyonu (kesinti süresini en aza indirme)

### 2. Acil Bakım (Emergency Maintenance)

- Incident response (olay müdahale)
- Hızlı kurtarma (quick recovery)
- İletişim planı (communication plan)
- Post-mortem analizi (olay sonrası analiz)
