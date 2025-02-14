# XCord Test Stratejisi

## Test Piramidi Yaklaşımı

XCord projesinde, yazılım kalitesini sağlamak ve sürdürülebilir geliştirmeyi desteklemek için test piramidi yaklaşımı benimsenmiştir. Bu yaklaşım, farklı test seviyelerinin dengeli bir dağılımını hedefler:

### 1. Birim Testleri (%50)

- **Amaç:** En küçük kod birimlerinin (fonksiyonlar, sınıflar, modüller) izole bir şekilde doğru çalıştığını doğrulamak.
- **Kapsam:**
    - **Frontend (React):**
        - Jest ve React Testing Library kullanılarak bileşen testleri, hook testleri ve yardımcı fonksiyon testleri.
    - **Backend (Rust & Node.js):**
        - Rust için `cargo test` ve Node.js için Jest kullanılarak servis testleri, yardımcı fonksiyon testleri ve model testleri.
- **Faydaları:** Hızlı geri bildirim, kolay hata ayıklama, kodun güvenilirliğini artırma.

### 2. Entegrasyon Testleri (%30)

- **Amaç:** Farklı bileşenlerin veya servislerin birlikte uyumlu bir şekilde çalıştığını doğrulamak.
- **Kapsam:**
    - API endpoint testleri (REST API'ler)
    - WebSocket bağlantı testleri (gerçek zamanlı iletişim)
    - Veritabanı işlemleri testleri (veri erişim katmanı)
    - Servisler arası iletişim testleri (mikroservis etkileşimleri)
    - Cache mekanizması testleri (önbellekleme katmanı)
- **Faydaları:** Sistem entegrasyon sorunlarını erken tespit etme, farklı katmanların uyumluluğunu sağlama.

### 3. Uçtan Uca (E2E) Testler (%15)

- **Amaç:** Kullanıcı senaryolarını baştan sona simüle ederek uygulamanın bütünleşik olarak doğru çalıştığını doğrulamak.
- **Kapsam:**
    - Playwright gibi araçlarla otomatik UI testleri (kullanıcı arayüzü testleri)
    - Temel kullanıcı akış testleri (login, mesaj gönderme, vb.)
    - Cross-browser testler (farklı tarayıcı uyumluluğu)
    - Mobile responsive testler (mobil cihaz uyumluluğu)
- **Faydaları:** Gerçek kullanıcı deneyimini simüle etme, kritik iş akışlarını doğrulama, kullanıcı arayüzü hatalarını tespit etme.

### 4. Performans Testleri (%5)

- **Amaç:** Uygulamanın performansını (hız, yük, ölçeklenebilirlik) belirli koşullar altında ölçmek ve değerlendirmek.
- **Kapsam:**
    - Yük testleri (k6 gibi araçlarla yüksek kullanıcı yükü altında performans ölçümü)
    - Stress testleri (sistemin sınırlarını zorlama ve dayanıklılığını test etme)
    - Scalability testleri (ölçeklenebilirlik gereksinimlerini karşılama)
    - Memory leak testleri (bellek sızıntılarını tespit etme)
- **Faydaları:** Performans darboğazlarını tespit etme, yüksek yük altında sistem davranışını anlama, kullanıcı deneyimini optimize etme.

## Test Ortamları

### 1. Yerel Geliştirme Ortamı (Local)

- **Kullanım:** Geliştiricilerin kendi makinelerinde birim ve entegrasyon testlerini çalıştırması için.
- **Özellikler:**
    - Geliştirici makinelerinde kolay kurulum ve çalıştırma.
    - Docker containerları ile servis bağımlılıklarını yönetme.
    - Mock servisler ve test veritabanları ile dış bağımlılıkları izole etme.

### 2. Sürekli Entegrasyon/Sürekli Dağıtım (CI/CD) Pipeline

- **Kullanım:** Otomatik test süreçlerini ve sürekli entegrasyonu sağlamak için.
- **Özellikler:**
    - GitLab CI/CD veya GitHub Actions gibi CI/CD araçları ile entegrasyon.
    - Tüm test seviyelerini (birim, entegrasyon, E2E) otomatik olarak çalıştırma.
    - Test sonuçlarını ve coverage raporlarını otomatik olarak oluşturma.

### 3. Staging Ortamı

- **Kullanım:** Production ortamına en yakın ortamda kapsamlı testler yapmak için.
- **Özellikler:**
    - Production ortamına benzer konfigürasyon ve altyapı.
    - Gerçek servisler ve test verisi ile entegrasyon testleri ve E2E testler.
    - Performans testleri ve güvenlik testleri için uygun ortam.

## Test Veri Yönetimi

### 1. Test Verisi Oluşturma

- **Yöntemler:**
    - Factory pattern (test verisi oluşturma sınıfları)
    - Faker kütüphanesi (sahte veri üretimi)
    - Seed data (başlangıç test verisi)
    - Fixture yönetimi (önceden hazırlanmış test verisi setleri)

### 2. Veritabanı Yönetimi

- **İlkeler:**
    - Testler için izole veritabanları kullanma (test ortamı ayrımı)
    - Transaction rollbacks (testler sonrası veritabanını temizleme)
    - Data cleanup (test verisini düzenli olarak temizleme)
    - Migration testleri (veritabanı şema değişikliklerini test etme)

## Güvenlik Testleri

### 1. Statik Kod Analizi (Static Analysis)

- **Araçlar:**
    - SonarQube (kod kalitesi ve güvenlik analizi platformu)
    - SAST (Static Application Security Testing) araçları (statik güvenlik test araçları)
    - Dependency scanning (bağımlılık tarama araçları)
- **Kapsam:**
    - Kod kalitesi kontrolü
    - Güvenlik açığı taraması
    - Bağımlılık güvenlik taraması

### 2. Dinamik Uygulama Güvenlik Testi (DAST)

- **Araçlar:**
    - DAST (Dynamic Application Security Testing) araçları (dinamik güvenlik test araçları)
    - Penetration testing (sızma testi)
    - Vulnerability scanning (zafiyet taraması)
- **Kapsam:**
    - Çalışan uygulamada güvenlik açığı taraması
    - Yetkilendirme ve kimlik doğrulama testleri
    - Input validation testleri

### 3. Fonksiyonel Güvenlik Testleri

- **Kapsam:**
    - Authentication testleri (kimlik doğrulama mekanizmalarını test etme)
    - Authorization testleri (yetkilendirme mekanizmalarını test etme)
    - Input validation (giriş doğrulama testleri)
    - XSS (Cross-Site Scripting) prevention testleri
    - CSRF (Cross-Site Request Forgery) protection testleri
    - Rate limiting (hız sınırlama testleri)

## Performans Test Senaryoları

### 1. Yük Testleri

```typescript
// k6 test örneği
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100, // Sanal kullanıcı sayısı
  duration: '5m', // Test süresi
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95. yüzdelik yanıt süresi < 500ms
    http_req_failed: ['rate<0.01'], // Hata oranı < %1
  },
};

export default function () {
  const res = http.get('https://api.xcord.app/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1); // Kullanıcılar arası bekleme süresi
}
```

### 2. Stress Test Metrikleri

- Response time (yanıt süresi) < 200ms
- Error rate (hata oranı) < %1
- CPU usage (CPU kullanımı) < %80
- Memory usage (bellek kullanımı) < %85
- Network latency (ağ gecikmesi) < 50ms

### 3. Scalability Testleri

- Concurrent users (eş zamanlı kullanıcı sayısı): 100,000+
- Message throughput (mesaj işleme hızı): 10,000/s
- Voice channels (ses kanalı sayısı): 1,000+
- File transfers (dosya transfer hızı): 1GB/s

## Test Otomasyonu

### 1. Frontend Test Örneği (React)

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Message } from '../components/Message';

describe('Message Component', () => {
  it('mesaj içeriğini render etmeli', () => {
    const { getByText } = render(
      <Message content="Test mesajı" timestamp={new Date()} />
    );
    expect(getByText('Test mesajı')).toBeInTheDocument();
  });
});
```

### 2. Backend Test Örneği (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_message_delivery() {
        let result = send_message("Test mesajı").await;
        assert!(result.is_ok());
    }
}
```

### 3. API Test Örneği

```typescript
describe('Message API', () => {
  it('yeni mesaj oluşturmalı', async () => {
    const response = await request(app)
      .post('/api/messages')
      .send({ content: 'Test mesajı' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

## Test Raporlama

### 1. Coverage Raporları

- Line coverage (satır coverage)
- Branch coverage (dal coverage)
- Function coverage (fonksiyon coverage)
- Statement coverage (ifade coverage)

### 2. Test Sonuç Raporları

- Başarılı/Başarısız test sayıları
- Execution time (test çalışma süresi)
- Error detayları (hata detayları)
- Screenshot/video kayıtları (UI testleri için)

### 3. Performans Raporları

- Response time grafikleri (yanıt süresi grafikleri)
- Error rate analizi (hata oranı analizi)
- Resource kullanım grafikleri (kaynak kullanım grafikleri - CPU, bellek, vb.)
- Trend analizi (performans trendlerini izleme)

## Kalite Güvence Süreci

### 1. Kod İnceleme Kontrol Listesi (Code Review Checklist)

- [ ] Birim test coverage yeterli mi?
- [ ] Entegrasyon testleri eklendi mi?
- [ ] Performans testleri yapıldı mı?
- [ ] Security testleri geçildi mi?
- [ ] Documentation güncel mi?

### 2. Release Kontrol Listesi (Release Checklist)

- [ ] Tüm test suitleri başarılı
- [ ] Performans kriterleri karşılandı
- [ ] Security scan temiz
- [ ] UAT (Kullanıcı Kabul Testi) tamamlandı
- [ ] Monitoring araçları hazır

### 3. Sürekli İyileştirme

- Test automation coverage artırımı
- Test execution time optimizasyonu
- Flaky test eliminasyonu (kararsız testleri giderme)
- Test maintenance (test bakımını düzenli yapma)
- Tool ve framework güncellemeleri

## İzleme ve Uyarı Sistemi (Monitoring ve Alerting)

### 1. Test Metrikleri İzleme

- Test execution time (test çalışma süresi)
- Pass/fail oranları (başarılı/başarısız test oranları)
- Coverage trending (coverage trendleri)
- Performance metrics (performans metrikleri)

### 2. Uyarı Kuralları (Alert Rules)

- Critical test failures (kritik test hataları)
- Performance degradation (performans düşüşü)
- Security vulnerabilities (güvenlik açıkları)
- Coverage düşüşleri (coverage oranında düşüş)

## Ekler

### 1. Test Araçları ve Frameworkler

- Jest (JavaScript test framework)
- Playwright (E2E test aracı)
- k6 (performans test aracı)
- SonarQube (kod kalitesi ve güvenlik platformu)
- JMeter (performans test aracı)
- Postman/Newman (API test araçları)

### 2. En İyi Uygulamalar (Best Practices)

- Test isolation (test izolasyonu)
- Deterministic tests (belirleyici testler)
- Fast execution (hızlı çalışma)
- Maintainable test code (bakımı kolay test kodu)
- Clear failure messages (anlaşılır hata mesajları)

### 3. Referans Dokümanlar

- Unit test guidelines (birim test kılavuzları)
- Integration test patterns (entegrasyon test desenleri)
- E2E test scenarios (E2E test senaryoları)
- Performance test planları (performans test planları)
