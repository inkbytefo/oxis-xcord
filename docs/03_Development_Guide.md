# Geliştirme Kılavuzu

## 1. Ön Gereksinimler

-   Node.js 18+
-   MongoDB
-   Redis
-   Docker (Opsiyonel)
-   Git

## 2. Geliştirme Ortamını Kurulumu

1.  **Depoyu Klona Alma:**

    ```bash
    git clone https://github.com/xcord/xcord.git
    cd xcord
    ```

2.  **Bağımlılıkları Yükleme:**

    ```bash
    # Frontend
    cd frontend
    npm install
    cd ..

    # Backend (Her servis için ayrı ayrı)
    cd backend/auth-service
    npm install
    cd ../messaging-service
    npm install
    cd ../voice-service
    npm install
    cd ../server-management-service
    npm install
    cd ../api-gateway
    npm install
    cd ..
    ```

3.  **Ortam Değişkenlerini Ayarlama:**

    -   Her servis için `.env.example` dosyasını `.env` olarak kopyalayın ve gerekli bilgileri doldurun.
    -   Özellikle veritabanı, Redis ve JWT secret key'leri gibi hassas bilgileri doğru ayarladığınızdan emin olun.

4.  **Docker ile Çalıştırma (Opsiyonel):**

    ```bash
    docker-compose up --build
    ```

    Bu komut, tüm backend servislerini, MongoDB ve Redis'i başlatacaktır. Frontend'i çalıştırmak için, frontend dizininde `npm run dev` komutunu çalıştırabilirsiniz.

## 3. Servisleri Çalıştırma

### 3.1 Geliştirme Modu

Her servis, geliştirme modunda ayrı ayrı çalıştırılabilir:

```bash
cd backend/[service-name]
npm run dev
```

### 3.2 Docker ile Çalıştırma

```bash
docker-compose up -d
```

Bu komut, `docker-compose.yml` dosyasında tanımlanan tüm servisleri başlatır.

## 4. Servis Kılavuzları

Her bir servis için ayrıntılı geliştirme kılavuzları, aşağıdaki dokümanlarda bulunabilir:

-   [Auth Service](docs/services/auth-service.md)
-   [Messaging Service](docs/services/messaging-service.md)
-   [Voice Service](docs/services/voice-service.md)
-   [Server Management Service](docs/services/server-management-service.md)
-   [API Gateway](backend/api-gateway/README.md) (Henüz dokümante edilmedi)

## 5. Ortam Değişkenleri

Servislerin yapılandırılması için kullanılan ortam değişkenleri, her servisin `.env` dosyasında tanımlanır. Örnek bir `.env` dosyası:

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/auth
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

## 6. Test

Her servis için test komutları, ilgili servislerin `package.json` dosyalarında tanımlanmıştır. Örneğin:

```bash
# Auth Service için testleri çalıştır
cd backend/auth-service
npm run test
```

## 7. Kod Stili ve Git İş Akışı

-   Kod yazım standartları için [Kod Yazım Standartları](docs/guides/code-style.md) dokümanına başvurun.
-   Git iş akışı için [Git İş Akışı Kılavuzu](docs/guides/git-workflow.md) dokümanına başvurun.