# Katkı Sağlama Kılavuzu - Başlangıç

## Projeye Katkıda Bulunmak

XCord projesine katkıda bulunmak, hem deneyimli geliştiriciler hem de yeni başlayanlar için harika bir fırsattır. Bu kılavuz, projeye nasıl katkıda bulunabileceğiniz konusunda size rehberlik edecektir.

## Ön Gereksinimler

- **Git:** Sürüm kontrolü için Git kullanıyoruz.
- **Node.js ve npm:** Frontend ve backend geliştirme için Node.js ve npm gereklidir.
- **Docker (Opsiyonel):** Geliştirme ortamını kolayca kurmak için Docker kullanabilirsiniz.
- **Tercihen bir IDE veya Kod Editörü:** VS Code, WebStorm gibi.

## Geliştirme Ortamını Kurulumu

1. **Depoyu Klona Alma**

```bash
git clone https://github.com/xcord/xcord.git
cd xcord
```

2. **Bağımlılıkları Yükleme**

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
cd ../server-management-service
npm install
cd ../voice-service
npm install
cd ../api-gateway
npm install
cd ..
```

3. **Ortam Değişkenlerini Ayarlama**
   - Her servis için `.env.example` dosyasını `.env` olarak kopyalayın ve gerekli bilgileri doldurun.
   - Özellikle veritabanı, Redis ve JWT secret key'leri gibi hassas bilgileri doğru ayarladığınızdan emin olun.

4. **Docker ile Çalıştırma (Opsiyonel)**
   ```bash
   docker-compose up --build
   ```

## Kodlama Standartları

- Kod yazım standartlarımıza uyun (bkz. [Kod Yazım Standartları](docs/guides/code-style.md)).
- Anlamlı commit mesajları yazın (bkz. [Git İş Akışı Kılavuzu](docs/guides/git-workflow.md)).
- Yeni özellikler eklerken veya hataları düzeltirken test yazmayı unutmayın.

## Katkı Süreci

1. **Issue Bulma veya Oluşturma**
   - Mevcut issue'ları inceleyin veya yeni bir özellik/hata için issue oluşturun.
   - Issue'da, ne üzerinde çalıştığınızı ve nasıl bir çözüm önerdiğinizi açıklayın.

2. **Branch Oluşturma**
   - `develop` branch'inden yeni bir branch oluşturun:
     ```bash
     git checkout develop
     git checkout -b feature/your-feature-name
     ```

3. **Kodlama**
   - İlgili değişiklikleri yapın.
   - Kodunuzu düzenli olarak commit edin.
   - Testlerinizi çalıştırın ve başarılı olduğundan emin olun.

4. **Pull Request Oluşturma**
   - Değişikliklerinizi remote'a push edin:
     ```bash
     git push origin feature/your-feature-name
     ```
   - GitHub'da bir Pull Request (PR) oluşturun.
   - PR'da, yaptığınız değişiklikleri, neden yaptığınızı ve nasıl test ettiğinizi açıklayın.
   - Code review için bekleyin.

5. **Code Review**
   - Diğer geliştiriciler tarafından kodunuz incelenecektir.
   - Gelen yorumları dikkate alın ve gerekli değişiklikleri yapın.
   - Değişiklikleri tekrar commit edin ve push edin.

6. **Merge**
   - Code review'dan sonra, kodunuz `develop` branch'ine merge edilecektir.
   - Daha sonra, `main` branch'ine release edilebilir.

## İletişim

- Proje ile ilgili sorularınız veya yardıma ihtiyacınız olursa, issue'larda veya iletişim kanallarımızda (örneğin, Discord) bizimle iletişime geçebilirsiniz.