# Dağıtım Kılavuzu

## 1. Dağıtım Ortamları

### 1.1 Geliştirme Ortamı (Development)

-   **Amaç:** Uygulama geliştirme ve birim testleri için kullanılan ortam.
-   **Özellikler:**
    -   Yerel geliştirme ortamı (Docker Compose).
    -   Debug modu aktiftir.
    -   Hot-reload (anında yenileme) özelliği etkindir.
    -   Test veritabanları kullanılır.
    -   Mock servisler (sahte servisler) kullanılabilir.

### 1.2 Staging Ortamı

-   **Amaç:** Production (canlı) ortam öncesi son testler ve doğrulama için kullanılan ortam.
-   **Özellikler:**
    -   Production ortamına benzer konfigürasyon kullanılır.
    -   Gerçek servisler ve test verisi ile entegrasyon testleri yapılır.
    -   Performans izleme araçları aktiftir.
    -   Güvenlik testleri bu ortamda gerçekleştirilir.

### 1.3 Production Ortamı

-   **Amaç:** Son kullanıcıların uygulamaya eriştiği canlı ortam.
-   **Özellikler:**
    -   Yüksek erişilebilirlik (high availability) gereksinimleri karşılanır.
    -   Otomatik ölçeklendirme (auto-scaling) mekanizmaları aktiftir.
    -   Tam yedekleme (full backup) ve kurtarma stratejileri uygulanır.
    -   7/24 kesintisiz izleme (monitoring) yapılır.

## 2. Dağıtım Mimarisi

### 2.1 Konteyner Orkestrasyonu

XCord, konteyner tabanlı bir uygulama olup, Docker ve Kubernetes gibi teknolojilerle dağıtılır.

### 2.2 Kubernetes Yapılandırması

Kubernetes, konteyner orkestrasyonu için kullanılır ve uygulama ölçeklendirme, yük dengeleme ve yönetimini kolaylaştırır.

## 3. Sürekli Entegrasyon/Sürekli Dağıtım (CI/CD)

### 3.1 CI/CD Pipeline

GitHub Actions, otomatik test, build ve dağıtım süreçlerini yönetmek için kullanılır.

### 3.2 Dağıtım Stratejileri

-   **Rolling Update (Kademeli Güncelleme):**
    -   Uygulama versiyon güncellemeleri sırasında sıfır kesinti (zero-downtime) sağlar.
    -   Kademeli olarak yeni versiyon devreye alınır, eski versiyonlar aşamalı olarak kapatılır.
    -   Otomatik geri alma (rollback) özelliği bulunur.
    -   Sağlık kontrolü (health check) mekanizmaları ile entegredir.

-   **Blue/Green Deployment (Mavi/Yeşil Dağıtım):**
    -   İki özdeş ortam (mavi ve yeşil) kullanılır.
    -   Yeni versiyon, aktif olmayan ortama (yeşil) dağıtılır ve test edilir.
    -   Testler başarılı olduğunda, trafik anında yeni ortama (yeşil) yönlendirilir.
    -   Hızlı geri alma (rollback) imkanı sunar.
    -   Risk minimizasyonu için idealdir.

## 4. İzleme ve Günlük Kaydı (Monitoring & Logging)

### 4.1 Logging Yapılandırması

Winston gibi logging kütüphaneleri ile yapılandırılmış günlükleme sistemi, uygulama davranışlarını izlemek için önemlidir.

### 4.2 Monitoring Araçları

-   Prometheus: Metrik toplama ve izleme sistemi.
-   Grafana: Veri görselleştirme ve dashboard oluşturma aracı.
-   ELK Stack (Elasticsearch, Logstash, Kibana): Merkezi günlük yönetimi ve analizi.
-   Jaeger: Dağıtık tracing sistemi.

### 4.3 Uyarı Sistemi (Alerting)

-   CPU/Memory kullanım uyarıları
-   Hata oranı (error rate) izleme ve uyarıları
-   Yanıt süresi (response time) uyarıları
-   İş metrikleri (business metrics) uyarıları

## 5. Veritabanı Yönetimi

### 5.1 Migration Stratejisi

Veritabanı şema değişikliklerini yönetmek için migration araçları kullanılır.

### 5.2 Yedekleme Planı (Backup Plan)

-   Günlük tam yedekleme (daily full backup)
-   Saatlik incremental yedekleme (hourly incremental backup)
-   Cross-region replikasyon (bölgeler arası yedekleme)
-   Düzenli restore testleri (yedekleme geri yükleme testleri)

## 6. Güvenlik Önlemleri

### 6.1 SSL/TLS Yapılandırması

HTTPS ve WSS (WebSocket Secure) bağlantıları için SSL/TLS yapılandırması zorunludur.

### 6.2 Güvenlik Başlıkları (Security Headers)

HTTP güvenlik başlıkları, web uygulamasının güvenliğini artırmak için kullanılır.

## 7. Performans Optimizasyonu

### 7.1 Caching Stratejisi

-   Redis: Veritabanı ve uygulama seviyesinde önbellekleme için.
-   Browser Caching: Statik varlıklar için tarayıcı önbelleklemesi.
-   CDN (Content Delivery Network): Statik içerik dağıtımı ve önbellekleme.
-   Object Caching: Nesne seviyesinde önbellekleme.

### 7.2 Yük Dengeleme (Load Balancing)

-   NGINX Load Balancer: HTTP trafiği için yük dengeleme.
-   Kubernetes Service: Servisler arası yük dengeleme.
-   Geographic Distribution: Coğrafi olarak dağıtılmış yük dengeleme.
-   Session Affinity: Oturum sürekliliği için yük dengeleme.

## 8. Felaket Kurtarma (Disaster Recovery)

### 8.1 Yedekleme Stratejisi

-   Otomatik yedeklemeler (automated backups)
-   Geo-redundant storage (coğrafi yedekli depolama)
-   Point-in-time recovery (zamana bağlı kurtarma)
-   Backup verification (yedekleme doğrulama)

### 8.2 Failover Planı

-   Otomatik failover (otomatik yedek sisteme geçiş)
-   Multi-region deployment (çok bölgeli dağıtım)
-   Data sync stratejisi (veri senkronizasyon stratejisi)
-   Recovery Time Objectives (RTO - kurtarma zamanı hedefleri)

## 9. Ortam Değişkenleri (Environment Variables)

### 9.1 Production Ortamı Örneği

```env
NODE_ENV=production
DATABASE_URL=postgres://user:password@host:5432/db
REDIS_URL=redis://host:6379
API_KEY=your_api_key
```

### 9.2 Secret Yönetimi (Secrets Management)

Hassas bilgilerin (API anahtarları, veritabanı şifreleri vb.) güvenli yönetimi için:

-   Kubernetes Secrets
-   HashiCorp Vault
-   AWS KMS (Key Management Service)
-   Environment encryption (ortam değişkeni şifreleme)

## 10. Dağıtım Kontrol Listesi (Deployment Checklist)

### 10.1 Dağıtım Öncesi (Pre-deployment)

-   \[ ] Tüm testler başarılı
-   \[ ] Güvenlik taraması tamamlandı
-   \[ ] Performans testleri geçti
-   \[ ] Dokümantasyon güncel
-   \[ ] Veritabanı migration'ları hazır

### 10.2 Dağıtım Sırası (Deployment)

-   \[ ] Veritabanı yedeği alındı
-   \[ ] Servisler scale down (düşürüldü)
-   \[ ] Yeni versiyon dağıtıldı
-   \[ ] Servisler scale up (artırıldı)
-   \[ ] Sağlık kontrolleri başarılı

### 10.3 Dağıtım Sonrası (Post-deployment)

-   \[ ] Monitoring aktif
-   \[ ] Uyarılar (alerts) yapılandırıldı
-   \[ ] Metrikler normal seviyede
-   \[ ] Kullanıcı geri bildirimleri olumlu
-   \[ ] Hata (error) artışı yok

## 11. Geri Alma Planı (Rollback Plan)

### 11.1 Otomatik Geri Alma

-   Hata eşik izleme (error threshold monitoring)
-   Otomatik versiyon değiştirme (automated version switching)
-   Veri tutarlılık kontrolleri (data consistency checks)
-   Servis sağlık doğrulama (service health validation)

### 11.2 Manuel Geri Alma

-   Önceki versiyonu geri yükleme (previous version restore)
-   Veri kurtarma adımları (data recovery steps)
-   Servis yeniden başlatma prosedürü (service restart procedure)
-   Kullanıcı iletişim planı (user communication plan)

## 12. Bakım (Maintenance)

### 12.1 Planlı Bakım (Scheduled Maintenance)

-   Update windows (güncelleme zaman aralıkları)
-   Kullanıcı bilgilendirme (user notification)
-   Servis düşüşü (service degradation)
-   Downtime minimizasyonu (kesinti süresini en aza indirme)

### 12.2 Acil Bakım (Emergency Maintenance)

-   Incident response (olay müdahale)
-   Hızlı kurtarma (quick recovery)
-   İletişim planı (communication plan)
-   Post-mortem analizi (olay sonrası analiz)