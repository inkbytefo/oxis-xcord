# Kod İnceleme (Code Review) Süreci

## Kod İncelemenin Önemi

Kod inceleme, yazılım kalitesini artırmak, hataları erken tespit etmek, kod standartlarını sağlamak ve bilgi paylaşımını teşvik etmek için kritik bir süreçtir.

## İnceleme Öncesi Hazırlık

- **PR Açıklamasını İnceleyin:** PR'ın ne amaçla oluşturulduğunu, yapılan değişiklikleri ve testleri anlayın.
- **İlgili Issue'ları İnceleyin:** Eğer varsa, PR'ın ilgili olduğu issue'ları inceleyin.
- **Değişiklikleri İnceleyin:** Kod değişikliklerini dikkatlice inceleyin.
- **Çalışma Ortamını Hazırlayın:** Gerekirse, PR'daki değişiklikleri yerel ortamınızda çalıştırın.

## İnceleme Kriterleri

1. **Kod Kalitesi**
   - Kod standartlarına uygunluk (bkz. [Kod Yazım Standartları](docs/guides/code-style.md))
   - Okunabilirlik ve anlaşılırlık
   - DRY (Don't Repeat Yourself) prensibi
   - SOLID prensipleri
   - Karmaşık kod bloklarının basitleştirilmesi
   - Performans etkileri

2. **Fonksiyonellik**
   - Değişikliklerin istenen işlevi yerine getirip getirmediği
   - Edge case'lerin (kenar durumları) doğru işlenip işlenmediği
   - Hatalı veya beklenmedik davranışların olup olmadığı

3. **Test Kapsamı**
   - Yeterli birim testlerinin yazılıp yazılmadığı
   - Entegrasyon testlerinin varlığı
   - Testlerin kapsamı ve doğruluğu
   - Testlerin başarılı olup olmadığı

4. **Güvenlik**
   - Güvenlik açıklarının olup olmadığı (örneğin, XSS, SQL injection)
   - Güvenlik önlemlerinin doğru uygulanıp uygulanmadığı (bkz. [Güvenlik Politikaları ve Standartları](docs/operations/security.md))

5. **Dokümantasyon**
   - Kod yorumlarının ve dokümantasyonun yeterli olup olmadığı
   - API dokümantasyonunun güncel olup olmadığı (bkz. [API Dokümantasyon Kılavuzu](docs/guides/api-documentation.md))
   - Değişikliklerin dokümantasyona yansıtılıp yansıtılmadığı

6. **Performans**
   - Performans darboğazlarının olup olmadığı
   - Kodun verimli çalışıp çalışmadığı
   - Bellek yönetimi

## İnceleme Yorumları

- **Olumlu Yorumlar:** Değişikliklerin iyi olduğunu ve onayladığınızı belirtin.
- **Olumsuz Yorumlar:** Düzeltilmesi gereken sorunları, nedenleriyle birlikte açıklayın.
- **Öneri Yorumları:** İyileştirme önerilerinde bulunun.
- **Soru Yorumları:** Anlaşılmayan noktaları veya daha fazla bilgiye ihtiyaç duyduğunuz durumları sorun.

## İnceleme Sonrası

- **Değişiklik İsteği:** Eğer değişiklik yapılması gerekiyorsa, "Request changes" seçeneğini işaretleyin ve yorumlarınızı yazın.
- **Onay:** Eğer değişiklikler kabul edilebilir durumdaysa, "Approve" seçeneğini işaretleyin.
- **Tartışma:** Gerekirse, PR'ın yazarı ile yorumlar hakkında tartışın.
- **Tekrar İnceleme:** Değişiklikler yapıldıktan sonra, tekrar inceleme yapın.

## İpuçları

- **Önyargısız Olun:** Kodun yazarına değil, koda odaklanın.
- **Nazik Olun:** Yorumlarınızı yapıcı bir şekilde ifade edin.
- **Detaylı Olun:** Yorumlarınızda mümkün olduğunca detaylı olun.
- **Hızlı Olun:** Kod incelemelerini zamanında yapmaya çalışın.
- **Öğrenmeye Açık Olun:** Farklı yaklaşımlardan ve kodlama tarzlarından öğrenin.