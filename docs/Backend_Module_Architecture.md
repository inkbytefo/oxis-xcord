# Backend Modül Mimarisi

Bu doküman, XCord projesi için güncellenmiş backend modül mimarisini özetlemektedir. Mevcut hafıza bankası ve dokümantasyon doğrultusunda revize edilmiştir.

## Genel Bakış

- Modüler Tasarım: Servislerin ayrılması (API Gateway, Authentication, Messaging, Voice, Server Management) daha iyi sürdürülebilirlik için.
- Olay Güdümlü Mimari: Merkezi olay yönetimi, kullanıcı eylemlerini, mesaj teslimini ve sesli arama operasyonlarını ele alır.
- Gerçek Zamanlı İletişim: Socket.io kullanarak SocketManager deseni, kimlik doğrulama için güçlü ara katman yazılımı ile uygulanır.
- Veritabanı Entegrasyonu: Varlık tanımlarını (örneğin, Sunucu, Mesaj) ORM desteği ile tutarlılık ve ölçeklenebilirlik için kullanır.
- Hata Yönetimi ve Günlük Kaydı: Yapılandırılmış hata yanıtları ve pino aracılığıyla günlük kaydı, gözlemlenebilirliği sağlamak için uygulanır.
- Ölçeklenebilirlik ve Performans: Redis oturum, varlık ve yazma göstergesi yönetimi için kullanılır. RabbitMQ esnek asenkron operasyonlar için kullanılır.

## Bileşen Analizi

1.  **API Gateway**
    Hem REST hem de WebSocket (gerçek zamanlı) iletişim için merkezi giriş noktası görevi görür.

2.  **Authentication Service**
    JWT tabanlı kimlik doğrulamayı istek doğrulama ile birlikte API uç noktalarını güvence altına almak için yönetir.

3.  **Messaging Service**
    Tanımlı veri modellerini kullanarak mesaj gönderme, depolama ve alma ile ilgili işlemleri ele alır.

4.  **Voice Service**
    Gelişmiş bir SocketManager'ı kullanarak gerçek zamanlı sesli arama işlevlerini denetler, güvenli bağlantı ve verimli olay yayılımı sağlar.

5.  **Server Management Service**
    Sunucuların yaşam döngüsünü (oluşturma, güncelleme, silme) kontrol eder ve kullanıcı rollerini ve ilgili izinleri yönetir.

## Uygulanan Tasarım Desenleri

- **Olay Sistemi:** Merkezi olay oluşturma ve tutarlı bir şemayı izleyerek gönderme.
- **Socket Manager Deseni:** Güvenli soket bağlantıları, gerçek zamanlı iletişim ve verimli kaynak yönetimi sağlar.
- **JWT Kimlik Doğrulaması için Ara Katman Yazılımı:** Token'ları inceleyerek istekleri doğrular ve istek nesnelerini kullanıcı verileriyle zenginleştirir.
- **Hata ve Günlük Kaydı Desenleri:** İstisnaların ve operasyonel günlüklerin pino kullanarak tutarlı bir şekilde yakalanması, daha kolay hata ayıklama ve izleme için.

## İyileştirmeler ve Gelecek Yönelimler

- **Gelişmiş Modülerlik:** Gelecekteki bakım ve ölçeklenebilirliği basitleştirmek için net görev ayrımı.
- **Güçlü Hata Yönetimi:** Özel hata türlerinin benimsenmesi ve geliştirilmiş günlük kaydı, sorun çözümünü kolaylaştırmak için.
- **Optimize Edilmiş Gerçek Zamanlı İletişim:** Daha yüksek eşzamanlı bağlantıları karşılamak için yükseltilmiş SocketManager işlevleri.
- **Yapılandırma Yönetimi:** Daha iyi esneklik için ortam değişkenlerini kullanarak merkezi yapılandırma yönetimi.
- **Servis Ayrıştırma:** Gelecek planları, sorumlulukların daha fazla izolasyonu için mikroservisler mimarisine geçişi içerir.

Bu güncellenmiş mimari, XCord projesinin gelişen teknik desenleri ve gereksinimleri ile uyumlu, ölçeklenebilir, sürdürülebilir ve sağlam bir backend için temel oluşturur.
