# Pull Request (PR) Süreci

## Pull Request Nedir?

Pull Request (PR), kod değişikliklerinizi ana projeye (örneğin, `main` veya `develop` branch'ine) entegre etme sürecidir. PR'lar, kod incelemesi, tartışma ve entegrasyon için bir araç sağlar.

## PR Oluşturma Adımları

1. **Branch Oluşturma**
   - Yeni bir özellik veya hata düzeltmesi için, `develop` branch'inden yeni bir branch oluşturun.
     ```bash
     git checkout develop
     git checkout -b feature/your-feature-name
     ```

2. **Değişiklikleri Yapma**
   - İlgili kod değişikliklerini yapın.
   - Kodunuzu düzenli olarak commit edin.
   - Commit mesajlarınızın anlamlı ve açıklayıcı olduğundan emin olun (bkz. [Git İş Akışı Kılavuzu](docs/guides/git-workflow.md)).
   - Testlerinizi çalıştırın ve başarılı olduğundan emin olun.

3. **Değişiklikleri Push Etme**
   - Değişikliklerinizi remote repoya push edin.
     ```bash
     git push origin feature/your-feature-name
     ```

4. **Pull Request Oluşturma**
   - GitHub'da, oluşturduğunuz branch'i `develop` branch'ine karşı bir PR oluşturun.
   - PR oluştururken aşağıdaki bilgileri sağlayın:
     - **Başlık:** Değişikliğin kısa ve öz açıklaması.
     - **Açıklama:** Yaptığınız değişikliklerin detaylı açıklaması, neden yaptığınız, nasıl çalıştığı ve olası etkileri.
     - **İlgili Issue:** Eğer varsa, PR'ın ilgili olduğu issue'nun bağlantısı.
     - **Testler:** Yaptığınız testleri ve test sonuçlarını belirtin.
     - **Ekran Görüntüsü/Video (Opsiyonel):** UI değişiklikleri veya karmaşık özellikler için ekran görüntüleri veya videolar ekleyebilirsiniz.

5. **Code Review**
   - PR'ınız, diğer geliştiriciler tarafından incelenecektir.
   - Gelen yorumları dikkatlice okuyun ve anlayın.
   - Gerekli değişiklikleri yapın ve yeni commit'ler push edin.
   - Değişikliklerinizi push ettiğinizde, PR otomatik olarak güncellenecektir.

6. **Tartışma ve İşbirliği**
   - Code review sırasında, yorumlar ve öneriler hakkında tartışabilirsiniz.
   - Diğer geliştiricilerle işbirliği yaparak en iyi çözümü bulmaya çalışın.

7. **PR'ın Merge Edilmesi**
   - Tüm code review'lar tamamlandıktan ve gerekli değişiklikler yapıldıktan sonra, PR merge edilebilir.
   - PR'ı merge eden kişi, genellikle code review'u yapan veya proje yöneticisidir.
   - Merge edildikten sonra, değişiklikler `develop` branch'ine entegre edilmiş olur.

## PR'da Dikkat Edilmesi Gerekenler

- **Kod Kalitesi:** Kodunuzun temiz, okunabilir ve bakımı kolay olduğundan emin olun (bkz. [Kod Yazım Standartları](docs/guides/code-style.md)).
- **Test Kapsamı:** Değişiklikleriniz için yeterli test yazdığınızdan emin olun.
- **Dokümantasyon:** Değişikliklerinizle ilgili dokümantasyonu güncelleyin.
- **Küçük ve Odaklı PR'lar:** PR'larınızı küçük ve tek bir amaca odaklı tutmaya çalışın. Bu, code review sürecini kolaylaştırır.
- **Conflict Çözümü:** Eğer PR'ınızda conflict oluşursa, bunları çözmeniz gerekir.

## PR Şablonu

```markdown
## Değişiklik Açıklaması
[Değişikliğin kısa açıklaması]

## Değişiklik Tipi
- [ ] Yeni özellik
- [ ] Hata düzeltmesi
- [ ] Performans iyileştirmesi
- [ ] Refactoring
- [ ] Dokümantasyon güncellemesi

## Test
- [ ] Birim testler eklendi/güncellendi
- [ ] Entegrasyon testleri yapıldı
- [ ] Manuel testler yapıldı

## Kontrol Listesi
- [ ] Kod standartlarına uygun
- [ ] Testler başarılı
- [ ] Dokümantasyon güncellendi
- [ ] Değişiklik logu güncellendi

## İlgili Issue
[Issue linki]

## Screenshot/Video
[Varsa görsel/video]