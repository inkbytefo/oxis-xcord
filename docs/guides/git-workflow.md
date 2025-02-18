# Git İş Akışı Kılavuzu

## Genel Prensipler

1. **Branch Stratejisi**
   - `main`: Kararlı ve production-ready kod
   - `develop`: Aktif geliştirme branchi
   - `feature/*`: Yeni özellik geliştirmeleri
   - `bugfix/*`: Hata düzeltmeleri
   - `hotfix/*`: Acil production düzeltmeleri
   - `release/*`: Sürüm hazırlık branchleri

2. **Commit Mesajları**
   - Anlamlı ve açıklayıcı mesajlar kullanın
   - Conventional Commits formatına uyun
   - İlgili issue numaralarını ekleyin

## Branch İsimlendirme

```bash
# Yeni özellik
feature/auth-refresh-token
feature/voice-chat-rooms

# Hata düzeltme
bugfix/message-sync-issue
bugfix/user-profile-update

# Acil düzeltme
hotfix/security-vulnerability
hotfix/api-rate-limit

# Sürüm hazırlık
release/v1.2.0
release/v1.3.0-beta
```

## Commit Mesaj Formatı

```bash
# Format
<type>(<scope>): <description>

[optional body]

[optional footer]

# Örnekler
feat(auth): implement JWT refresh token mechanism
fix(api): resolve rate limiting issue in messaging service
docs(readme): update deployment instructions
test(user): add integration tests for profile update
chore(deps): update dependencies
refactor(messages): optimize message handling logic
```

### Commit Tipleri

- `feat`: Yeni özellik
- `fix`: Hata düzeltmesi
- `docs`: Dokümantasyon değişiklikleri
- `style`: Kod formatı değişiklikleri
- `refactor`: Kod yeniden yapılandırması
- `test`: Test ekleme veya düzenleme
- `chore`: Yapılandırma, bağımlılık vb. değişiklikler

## İş Akışı Adımları

### 1. Yeni Özellik Geliştirme

```bash
# Develop branchini güncelle
git checkout develop
git pull origin develop

# Yeni feature branch oluştur
git checkout -b feature/new-feature

# Geliştirme yap ve commit et
git add .
git commit -m "feat(scope): add new feature"

# Develop ile senkronize et
git checkout develop
git pull origin develop
git checkout feature/new-feature
git rebase develop

# Push ve Pull Request
git push origin feature/new-feature
```

### 2. Hata Düzeltme

```bash
# Develop branchten başla
git checkout develop
git pull origin develop

# Bugfix branch oluştur
git checkout -b bugfix/issue-description

# Düzeltmeyi yap ve commit et
git add .
git commit -m "fix(scope): resolve issue description"

# Push ve Pull Request
git push origin bugfix/issue-description
```

### 3. Acil Production Düzeltmesi

```bash
# Main branchten başla
git checkout main
git pull origin main

# Hotfix branch oluştur
git checkout -b hotfix/critical-issue

# Düzeltmeyi yap ve commit et
git add .
git commit -m "fix(scope): resolve critical issue"

# Main ve develop'a merge et
git checkout main
git merge hotfix/critical-issue
git push origin main

git checkout develop
git merge hotfix/critical-issue
git push origin develop
```

## Code Review Süreci

### Pull Request Şablonu

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
```

### Review Kriterleri

1. **Kod Kalitesi**
   - Kod standartlarına uygunluk
   - SOLID prensipleri
   - DRY (Don't Repeat Yourself)
   - Performans etkileri

2. **Test Kapsamı**
   - Birim testler
   - Entegrasyon testleri
   - Edge case'ler

3. **Dokümantasyon**
   - Kod yorumları
   - API dokümantasyonu
   - Değişiklik logu

## Sürüm Yönetimi

### Semantic Versioning

```bash
MAJOR.MINOR.PATCH
# Örnek: 1.2.3

MAJOR: Geriye uyumsuz değişiklikler
MINOR: Geriye uyumlu yeni özellikler
PATCH: Geriye uyumlu hata düzeltmeleri
```

### Release Süreci

1. **Release Branch Oluşturma**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.2.0
   ```

2. **Sürüm Hazırlığı**
   - Versiyon numarasını güncelle
   - Değişiklik logunu güncelle
   - Son testleri yap

3. **Release Merge**
   ```bash
   # Main'e merge
   git checkout main
   git merge release/v1.2.0
   git tag v1.2.0
   git push origin main --tags

   # Develop'a merge
   git checkout develop
   git merge release/v1.2.0
   git push origin develop
   ```

## Araçlar ve Entegrasyonlar

1. **Git Hooks**
   ```bash
   # pre-commit hook örneği
   #!/bin/sh
   npm run lint
   npm run test
   ```

2. **CI/CD Pipeline**
   ```yaml
   # .gitlab-ci.yml örneği
   stages:
     - lint
     - test
     - build
     - deploy

   lint:
     script:
       - npm run lint

   test:
     script:
       - npm run test

   build:
     script:
       - npm run build
   ```

3. **Branch Korumaları**
   - Main ve develop branchleri korumalı
   - Code review zorunluluğu
   - CI pipeline başarı şartı
   - Linear history zorunluluğu

## Sorun Giderme

### Yaygın Git Sorunları

1. **Conflict Çözümü**
   ```bash
   # Güncel değişiklikleri al
   git fetch origin
   git rebase origin/develop

   # Conflict çözümü sonrası
   git add .
   git rebase --continue
   ```

2. **Yanlış Branch'e Commit**
   ```bash
   # Son commit'i geri al
   git reset HEAD~1 --soft

   # Doğru branch'e geç
   git checkout correct-branch

   # Değişiklikleri commit et
   git add .
   git commit -m "feat: your feature"
   ```

3. **Reset İşlemleri**
   ```bash
   # Soft reset (değişiklikleri koru)
   git reset --soft HEAD~1

   # Hard reset (değişiklikleri sil)
   git reset --hard HEAD~1

   # Spesifik commit'e dön
   git reset --hard <commit-hash>