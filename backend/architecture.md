# Backend Mimarisi

## 1. Genel Bakış

XCord platformunun backend tarafı, mikroservis mimarisi üzerine inşa edilmiştir. Bu mimari, her bir servisin bağımsız olarak geliştirilmesini, dağıtılmasını ve ölçeklendirilmesini sağlar. Servisler arası iletişim, gRPC ve REST API'leri aracılığıyla gerçekleştirilir.

## 2. Servisler

### 2.1 API Gateway

-   **Rol:** Tüm istemci istekleri için giriş noktasıdır.
-   **Teknolojiler:** Express.js, Express HTTP Proxy, WebSocket
-   **Sorumluluklar:**
    -   İstek yönlendirme
    -   Yük dengeleme
    -   Kimlik doğrulama ve yetkilendirme
    -   Hız sınırlama
    -   API dokümantasyonu (OpenAPI/Swagger)
    -   WebSocket bağlantı yönetimi
-   **Port:** 3000

### 2.2 Kimlik Doğrulama Servisi (Auth Service)

-   **Rol:** Kimlik doğrulama ve yetkilendirme işlemlerini yönetir.
-   **Teknolojiler:** Node.js (Express.js), JWT, bcrypt, PostgreSQL, Redis
-   **Sorumluluklar:**
    -   Kullanıcı kaydı, girişi ve oturum yönetimi
    -   JWT token yönetimi
    -   Rol tabanlı yetkilendirme (RBAC)
    -   Şifre sıfırlama ve yönetimi
    -   İki faktörlü kimlik doğrulama (2FA)
-   **Port:** 3001

### 2.3 Mesajlaşma Servisi (Messaging Service)

-   **Rol:** Gerçek zamanlı mesajlaşma ve sohbet işlevselliği sağlar.
-   **Teknolojiler:** Node.js (Express.js, Socket.IO), Redis, PostgreSQL
-   **Sorumluluklar:**
    -   Gerçek zamanlı mesajlaşma (WebSocket)
    -   Kanal tabanlı iletişim
    -   Direkt mesajlaşma
    -   Mesaj geçmişi
    -   Okundu bilgisi
    -   Yazıyor göstergesi
    -   Çevrimiçi durum takibi
-   **Port:** 3002

### 2.4 Ses Servisi (Voice Service)

-   **Rol:** Ses ve video işleme sağlar.
-   **Teknolojiler:** Node.js (Express.js), MediaSoup, Socket.IO, WebRTC
-   **Sorumluluklar:**
    -   Sesli sohbet
    -   Ses akışı
    -   WebRTC yönetimi
    -   Oda yönetimi
    -   Ses kalitesi optimizasyonu
-   **Port:** 3003

### 2.5 Sunucu Yönetim Servisi (Server Management Service)

-   **Rol:** Altyapı ve dağıtım yönetimi sağlar.
-   **Teknolojiler:** Node.js (Express.js), PostgreSQL, Redis
-   **Sorumluluklar:**
    -   Sunucu oluşturma, düzenleme ve silme
    -   Kanal yönetimi
    -   Rol tabanlı yetkilendirme
    -   Üye yönetimi
    -   İzin sistemi
    -   Sunucu istatistikleri
-   **Port:** 3004

## 3. Servisler Arası İletişim

### 3.1 Protokol Seçimi

-   **gRPC:** Yüksek performanslı, dahili servisler arası iletişim için kullanılır (gelecekte).
-   **REST:** Harici API iletişimi ve daha basit dahili istekler için kullanılır.
-   **WebSocket:** Gerçek zamanlı özellikler (sohbet, ses) için kullanılır.

### 3.2 İletişim Modelleri

1.  **Senkron İletişim:**
    -   REST API'leri, istemciye yönelik endpoint'ler için kullanılır.
    -   gRPC, dahili servis çağrıları için kullanılacaktır (gelecekte).

2.  **Asenkron İletişim:**
    -   Mesaj kuyrukları (örneğin, RabbitMQ) olay güdümlü işlemler için kullanılacaktır (gelecekte).
    -   WebSocket, gerçek zamanlı güncellemeler için kullanılır.

### 3.3 Servis Keşfi

-   Ortam değişkenleri ve DNS kullanarak servis kayıt deseni.
-   Her servis için sağlık kontrolü (health check) endpoint'leri.

## 4. Güvenlik

-   **Kimlik Doğrulama Akışı:**
    1.  İstemci, API Gateway üzerinden kimlik doğrular.
    2.  Auth Service, kimlik bilgilerini doğrular ve JWT oluşturur.
    3.  JWT, sonraki istekler için kullanılır.
    4.  Servisler, token'ları Auth Service üzerinden doğrular.
-   **Yetkilendirme:**
    -   Rol tabanlı erişim kontrolü (RBAC).
    -   Servis seviyesinde API anahtarları (gelecekte).
    -   API Gateway'de hız sınırlama.

## 5. Veri Yönetimi

-   **Veritabanları:**
    -   PostgreSQL: Kullanıcı verileri, sunucu ve kanal bilgileri, mesajlar ve diğer kalıcı veriler için.
    -   Redis: Önbellekleme ve gerçek zamanlı özellikler için.

-   **Veri Tutarlılığı:**
    -   Olay tutarlılığı modeli (eventual consistency model).
    -   Servisler arası veri güncellemeleri için olay güdümlü yaklaşım (gelecekte).
    -   İyimser eşzamanlılık kontrolü (optimistic concurrency control).

## 6. Hata Yönetimi

-   Servis hataları için devre kesici (circuit breaker) deseni.
-   Fallback yanıtları.
-   Üstel geri alma (exponential backoff) ile yeniden deneme mekanizmaları.
-   Kapsamlı hata loglama.

## 7. İzleme ve Loglama

-   Winston kullanarak merkezi loglama.
-   Performans metrikleri toplama (Prometheus).
-   Sağlık kontrolü (health check) endpoint'leri.
-   Hata takibi ve raporlama.

## 8. Dağıtım

-   Docker kullanarak konteynerleştirme.
-   Kubernetes ile orkestrasyon (isteğe bağlı).
-   CI/CD pipeline desteği (GitHub Actions).
-   Ortam tabanlı yapılandırma (environment variables).
