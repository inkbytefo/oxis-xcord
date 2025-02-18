# XCord - Modern İletişim Platformu

[![CI/CD Pipeline](https://github.com/inkbytefo/11/actions/workflows/ci.yml/badge.svg)](https://github.com/inkbytefo/11/actions/workflows/ci.yml)

## Proje Yapısı

```
xcord/
├── frontend/           # Frontend uygulaması
├── backend/            # Backend servisleri
├── docs/               # Proje dokümantasyonu
│   ├── 00_Documentation_Structure.md # Dokümantasyon yapısı
│   ├── contributing/   # Katkı sağlama rehberleri
│   ├── guides/         # Geliştirici rehberleri
│   ├── operations/     # Operasyon rehberleri
│   └── services/       # Servis dokümantasyonları
├── docker-compose.yml  # Docker Compose yapılandırması
└── .gitignore          # Git ignore dosyası
```

## Dokümantasyon

Proje dokümantasyonu aşağıdaki klasörlerde bulunmaktadır:

-   **Proje Genel Bakışı:** `docs/01_Project_Overview.md`
-   **Mimari:** `docs/02_Architecture.md`
-   **Geliştirici Kılavuzu:** `docs/03_Development_Guide.md`
-   **Test Stratejisi:** `docs/04_Testing_Strategy.md`
-   **Dağıtım Kılavuzu:** `docs/05_Deployment_Guide.md`
-   **İyileştirme Önerileri:** `docs/06_Improvement_Suggestions.md`
-   **Kod Yazım Standartları:** `docs/guides/code-style.md`
-   **Git İş Akışı Kılavuzu:** `docs/guides/git-workflow.md`
-   **API Dokümantasyonu:** `docs/guides/api-documentation.md`
-   **İzleme ve Gözlemleme:** `docs/operations/monitoring.md`
-   **Güvenlik Politikaları:** `docs/operations/security.md`
-   **Katkı Sağlama Kılavuzu:** `docs/contributing/getting-started.md`
-   **Pull Request Süreci:** `docs/contributing/pull-request.md`
-   **Kod İnceleme Süreci:** `docs/contributing/code-review.md`
-   **Auth Servisi:** `docs/services/auth-service.md`
-   **Messaging Servisi:** `docs/services/messaging-service.md`
-   **Voice Servisi:** `docs/services/voice-service.md`
-   **Server Management Servisi:** `docs/services/server-management-service.md`
-   **Proje Özeti:** `docs/project_summary.md`

## Docker ile Çalıştırma

### Ön Gereksinimler

-   Docker
-   Docker Compose

### Hızlı Başlangıç

1.  Depoyu klonlayın:

    ```bash
    git clone https://github.com/inkbytefo/11.git
    cd 11
    ```

2.  Geliştirme ortamını başlatın:

    ```bash
    docker-compose up -d --build
    ```

    Bu, tüm servisleri başlatacaktır:

    -   Frontend: `http://localhost:8080`
    -   Backend API: `http://localhost:3000`
    -   PostgreSQL Veritabanı: `localhost:5432`

### Docker Komutları

#### Servisleri Başlatma

```bash
# Tüm servisleri başlat
docker-compose up -d

# Belirli bir servisi başlat
docker-compose up -d [service_name]
```

#### Servisleri Durdurma

```bash
# Tüm servisleri durdur
docker-compose down

# Tüm servisleri durdur ve volumeleri kaldır (temiz durum)
docker-compose down -v
```

#### Logları Görüntüleme

```bash
# Tüm logları görüntüle
docker-compose logs -f

# Belirli bir servisin loglarını görüntüle
docker-compose logs -f [service_name]
```

#### Servisleri Yeniden Oluşturma

```bash
# Tüm servisleri yeniden oluştur
docker-compose up -d --build

# Belirli bir servisi yeniden oluştur
docker-compose up -d --build [service_name]
```

## Geliştirme

### Frontend Geliştirme

-   Geliştirme sunucusu `http://localhost:5173` adresinde çalışır.
-   Backend API `http://localhost:3000` adresinde çalışır.
-   API health check: `http://localhost:3000/api/health`

### Masaüstü Uygulaması (Tauri)

Masaüstü uygulamasını geliştirmek için:

1.  Rust ve sistem bağımlılıklarını yükleyin:

    ```bash
    # Windows (via Chocolatey)
    choco install rust-ms visual-studio-2022-buildtools

    # macOS
    brew install rust

    # Linux
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```

2.  Frontend dizinine gidin:

    ```bash
    cd frontend
    ```

3.  Bağımlılıkları yükleyin:

    ```bash
    npm install
    ```

4.  Geliştirme modunda çalıştırın:

    ```bash
    npm run tauri:dev
    ```

5.  Masaüstü uygulamasını oluşturun:

    ```bash
    npm run tauri:build
    ```

    Oluşturulan çıktı `frontend/src-tauri/target/release` dizininde bulunacaktır.

## CI/CD Pipeline

Proje, sürekli entegrasyon ve dağıtım için GitHub Actions kullanır:

-   **Frontend Kontrolleri:**
    -   ESLint ile linting
    -   Jest ile birim testleri

-   **Backend Kontrolleri:**
    -   ESLint ile linting
    -   Jest ile birim testleri
    -   Docker image build

-   **Entegrasyon:**
    -   Docker Compose build
    -   Health check doğrulaması

Pipeline, otomatik olarak aşağıdaki olaylarda çalışır:

-   `main` branch'ine yapılan her push
-   `main` branch'ine yapılan her pull request

## Katkı Sağlama

Projemize katkıda bulunmak için lütfen [Katkı Sağlama Kılavuzu](docs/contributing/getting-started.md) ve [Pull Request Süreci](docs/contributing/pull-request.md) dokümanlarını inceleyin.

## Lisans

[MIT Lisansı](LICENSE)
