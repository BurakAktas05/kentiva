# Kentiva - Yayın Öncesi & Kötüye Kullanım Önleme Kılavuzu (Pre-Launch & Abuse Prevention)

Bu dosya, Kentiva platformunun kötüye kullanılmasını (abuse) engellemek amacıyla uygulanan güvenlik mekanizmalarını, puanlama sistemini ve yayın öncesi kontrol listesini içermektedir.

---

## 🛡️ 1. Kötüye Kullanımı Engelleme ve İhbar Analizi

Uygulamanın suistimal edilmesini önlemek ve sahte/müstehcen ihbarların sisteme girişini engellemek için üç aşamalı bir güvenlik duvarı uygulanmaktadır:

### A. Çok Modlu (Multimodal) Görsel ve İçerik Filtreleme
- **Yüz ve Selfie Engelleme:** Vatandaşların kendi yüzlerini, selfie'lerini veya alakasız insan fotoğraflarını çekip ihbar olarak göndermesini engellemek için `MediaGuard` servisi kullanılır. Tespit edilen yüz filtrelemelerinde sistem ihbarı anında **otomatik olarak reddeder**.
- **Müstehcenlik (Nudity/Obscenity) Kontrolü:** İhbar resimlerinin müstehcen içerik barındırmasını önlemek amacıyla:
  - Gemini API'nin görsel analiz yeteneklerinden (`inlineData` base64 payload ile) yararlanılır.
  - Sisteme yüklenen resimler asenkron olarak Gemini Safety Settings filtrelerinden ve medya analiz motorundan geçirilir.
  - Zararlı içerik, şiddet veya çıplaklık barındıran görseller tespit edildiğinde ihbar durumu anında `REJECTED` olarak güncellenir ve kullanıcının güven puanı düşürülür.

### B. Coğrafi Sınır (Geofencing) Doğrulaması
- Vatandaşların belediye sınırları dışındaki bölgelerden sahte veya alakasız ihbarlar oluşturmasını engellemek için PostGIS `ST_Contains` mekansal sorguları kullanılır.
- İhbar koordinatları belediyenin GeoJSON sınırlarıyla eşleşmiyorsa ihbar girişi veritabanı seviyesinde reddedilir.

---

## 📈 2. Vatandaş Güven Puanı (Reputation Scoring) Sistemi

Kullanıcıların platformdaki davranışlarına göre dinamik olarak değişen ve veritabanında saklanan bir **Reputation Score (Güven Puanı)** sistemi entegre edilmiştir. Bu sistem `CitizenReputationService` sınıfında yönetilir.

### Puan Kuralları:
| Eylem | Puan Değişimi (Delta) | Açıklama |
| :--- | :---: | :--- |
| **Yeni Kayıt / Varsayılan Başlangıç** | `+100` | Platforma yeni katılan vatandaşın varsayılan başlangıç puanı. |
| **İhbar Oluşturma** | `+25` | Her yeni ihbar gönderiminde kazanılan teşvik puanı. |
| **İhbarın Çözülmesi** | `+50` | Gönderilen ihbarın saha ekibince başarıyla çözülmesi durumunda kazanılan puan. |
| **İhbar Reddi (Standart)** | `-45` | Geçersiz, asılsız veya alakasız ihbar gönderildiğinde uygulanan ceza puanı. |
| **İhbar Reddi (Selfie/Yüz Görseli)** | `-70` | İhbar fotoğrafında yüz/selfie tespit edildiğinde uygulanan ağır ceza puanı. |

### Güven Seviyeleri (Reputation Levels):
- **800 - 1000 Puan:** Şehir Kahramanı
- **500 - 799 Puan:** Şehir Gönüllüsü
- **250 - 499 Puan:** Aktif Vatandaş
- **100 - 249 Puan:** Güvenilir Üye
- **0 - 99 Puan:** Yeni Üye / Düşük Güven

### 🚫 Kötüye Kullanım Bloklama Eşiği (Threshold):
- **Limit:** Bir vatandaşın güven puanı **`30` puanın altına düşerse**, yeni bir ihbar oluşturması sistem tarafından **engellenir**.
- **Hata Mesajı:** `"Güven puanınız çok düşük olduğundan yeni ihbar oluşturamazsınız."` (`LOW_REPUTATION_BLOCKED`) koduyla API isteği engellenir.

---

## 📋 3. Yayın Öncesi (Pre-Launch) Kontrol Listesi

Uygulamayı canlı ortama (production) almadan önce aşağıdaki adımların tamamlandığından %100 emin olunmalıdır:

- [x] **İhbar Denetim Raporu PDF Düzenlemesi:** PDF export şablonunun görsel tasarımı iyileştirildi. Durum (Status) ve Öncelik (Priority) alanlarına pastel renkli badge tasarımları eklendi, başlık altına dekoratif çizgi eklendi.
- [ ] **Gemini API Anahtarı Tanımlama:** Üretim ortamında `app.ai.gemini.api-key` değerinin Railway/Cloud ortamında secret olarak ayarlandığından emin olunmalı.
- [ ] **Flyway Veritabanı Migrasyonları:** Tüm SQL migrasyonlarının (`src/main/resources/db/migration/`) PostgreSQL üzerinde hatasız çalıştığı doğrulanmalı.
- [ ] **PostGIS Sınır Ayarları:** Kurulum sihirbazında (Onboarding) belediyelerin GeoJSON sınırlarının doğru çizildiğinden emin olunmalı.
- [ ] **Mobil Uygulama Yıldızlama (Favori) Özelliği:** Durak ve Hat yıldızlama özelliklerinin API ile senkronizasyonu canlı cihazlarda test edilmeli.
- [ ] **Performans & Derleme Kontrolü:** Projenin Maven derlemesi hatasız tamamlanmalı (`./mvnw clean compile`).
