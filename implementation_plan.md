# Ulaşım Modülünün Kaldırılması ve İhbar Görevli Atama Ekranının Geliştirilmesi

Bu plan kapsamında, sistemin MVP sürümündeki verimsiz otobüs/ulaşım seferleri özelliği tüm bileşenlerden kaldırılacak ve ihbar yönetimindeki saha personeli atama akışı daha premium, esnek ve kullanışlı bir yapıya kavuşturulacaktır.

## User Review Required

> [!WARNING]
> Bu değişiklik ile veritabanından `bus_routes`, `starred_routes` ve `starred_stops` tabloları kaldırılacaktır. Canlı sistemde bu tabloları temizleyecek bir Flyway migrasyonu (`V99__remove_bus_transit.sql`) uygulanacaktır.
>
> Görevli atama ekranı native `<select>` dropdown yerine; arama yapılabilen, departmana göre filtrelenebilen, çalışanların detaylı rollerini ve departmanlarını listeleyen ve halihazırda atanmış bir görevliyi kolayca değiştirmeye (reassign) imkan tanıyan modern bir inline panel/combobox yapısına dönüştürülecektir.

## Proposed Changes

---

### Backend (Temizlik ve DTO Genişletme)

#### [DELETE] [BusRouteController.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/controller/BusRouteController.java)
- Otobüs hatları ile ilgili tüm CRUD ve içe aktarma API uçları kaldırılacak.

#### [DELETE] [BusRouteService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/transit/BusRouteService.java)
- Ulaşım hatlarını yöneten ve Gemini API ile analiz eden servis katmanı silinecek.

#### [DELETE] [BusRouteServiceTest.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/test/java/com/burak/belediyeapp/service/transit/BusRouteServiceTest.java)
- BusRouteService birim testleri silinecek.

#### [DELETE] [IBusRouteRepository.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/repository/IBusRouteRepository.java)
- Ulaşım hatları veritabanı erişim arayüzü silinecek.

#### [DELETE] [IStarredRouteRepository.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/repository/IStarredRouteRepository.java)
- Favori hatlar veritabanı erişim arayüzü silinecek.

#### [DELETE] [IStarredStopRepository.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/repository/IStarredStopRepository.java)
- Favori duraklar veritabanı erişim arayüzü silinecek.

#### [DELETE] [BusRoute.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/entity/BusRoute.java)
#### [DELETE] [StarredRoute.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/entity/StarredRoute.java)
#### [DELETE] [StarredStop.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/entity/StarredStop.java)
#### [DELETE] [BusRouteDto.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/dto/response/transit/BusRouteDto.java)
- Ulaşım modülü ile ilişkili veritabanı varlıkları (Entity) ve DTO sınıfları silinecek.

#### [MODIFY] [GeminiService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/ai/GeminiService.java)
- `parseBusRoutes`, `parseBusRoutesFromPdf` ve `parseBusRoutesFromPdfMultiPass` metodları ve ilgili şablonlar temizlenecek.

#### [MODIFY] [AnnouncementNotificationService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/notification/AnnouncementNotificationService.java)
- Duyuru metninde geçen otobüs hattı/durağı tespiti yapan ve öncelikli (favorileyen) kullanıcılara özel push atan kodlar çıkarılacak. Duyuru sadece ilgili belediyeyi tercih eden tüm kullanıcılara standart olarak yayınlanacak şekilde basitleştirilecek.

#### [MODIFY] [AnnouncementNotificationServiceTest.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/test/java/com/burak/belediyeapp/service/notification/AnnouncementNotificationServiceTest.java)
- Değişen duyuru servisine uygun olarak test kurgusu güncellenecek, transit bağımlılıkları mock listesinden kaldırılacak.

#### [MODIFY] [UserResponse.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/dto/response/user/UserResponse.java)
- Kullanıcının profil bilgilerini içeren API yanıtına `String departmentId` ve `String departmentName` alanları eklenecek.

#### [MODIFY] [UserService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/user/UserService.java)
- `mapToResponse` metoduna kullanıcının bağlı olduğu departmanın kimliği ve adı eklenecek.

#### [MODIFY] [MunicipalityOnboardingService.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/java/com/burak/belediyeapp/service/municipality/MunicipalityOnboardingService.java)
- `toUserResponse` metoduna departman kimliği ve adı eklenecek.

#### [MODIFY] [UserControllerWebMvcTest.java](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/test/java/com/burak/belediyeapp/controller/UserControllerWebMvcTest.java)
- Birim testlerindeki mock `UserResponse` nesnesi yeni constructor parametrelerine göre düzenlenecek.

#### [NEW] [V99__remove_bus_transit.sql](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/backend/src/main/resources/db/migration/V99__remove_bus_transit.sql)
- Flyway migrasyon dosyası oluşturulacak. `starred_stops`, `starred_routes` ve `bus_routes` tablolarını `DROP TABLE ... CASCADE` ile kaldıracak.

---

### Admin Portal (Yönetici Paneli)

#### [DELETE] [BusRoutesManagementPage.tsx](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/admin-portal/src/pages/BusRoutesManagementPage.tsx)
#### [DELETE] [BusRoutesPanel.tsx](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/admin-portal/src/components/BusRoutesPanel.tsx)
- Ulaşım hatlarını yöneten sayfalar silinecek.

#### [MODIFY] [LanguageContext.tsx](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/admin-portal/src/context/LanguageContext.tsx)
- `bus_routes` dili ve çeviri tanımları kaldırılacak.

#### [MODIFY] [App.tsx](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/admin-portal/src/App.tsx)
- Sidebar navigasyonundaki `bus_routes` butonu kaldırılacak.
- `/bus-routes` route tanımı ve ilgili sayfanın lazy yüklemesi silinecek.

#### [MODIFY] [api.ts](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/admin-portal/src/api.ts)
- `User` arayüzüne (interface) `departmentId` ve `departmentName` eklenecek.

#### [MODIFY] [ReportDetailPage.tsx](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/admin-portal/src/pages/ReportDetailPage.tsx)
- Saha görevlisi atama modülü tamamen yenilenecek:
  - Görevli listesi `size=200` parametresi ile çekilerek sayfalama sınırları aşılacak.
  - Halihazırda atanmış bir görevli olduğunda da atama/değiştirme paneli görüntülenebilir olacak.
  - Arama çubuğu (`Search`) ile saha personeli adı veya e-postasına göre anlık filtreleme eklenecek.
  - Departman filtresi eklenecek. Yönetici, görevlileri departmanlarına göre süzebilecek (Örn: Sadece "Fen İşleri" personelini göster).
  - Personel listesinde her personelin departman adı (varsa) ve rolleri görsel etiketlerle (badge) listelenecek.
  - Görevli seçildiğinde anlık olarak API çağrısı ile atanacak ve "Görevli Değiştir" butonuyla bu panel açılıp kapatılabilecek.

---

### Mobil Uygulama (BelediyeHattı)

#### [DELETE] [BusScheduleScreen.tsx](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/belediyehattı/src/components/screens/BusScheduleScreen.tsx)
#### [DELETE] [busScheduleData.ts](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/belediyehattı/src/mock/busScheduleData.ts)
- Sefer saatleri ekranı ve mock verileri silinecek.

#### [MODIFY] [KentScreen.tsx](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/belediyehattı/src/components/screens/KentScreen.tsx)
- "Otobüs Seferleri Kartı" section'ı UI bileşeninden kaldırılacak.

#### [MODIFY] [App.tsx](file:///c:/Users/AKTASSAK/Desktop/belediyeapp/belediyehattı/src/App.tsx)
- Lazy import listesinden `BusScheduleScreen` kaldırılacak.
- `activeTab === 'bus'` koşullu render alanı silinecek.
- Alt menü veya diğer yönlendirmelerden otobüs sayfasına giden `setActiveTab('bus')` tetikleyicileri temizlenecek.

---

## Verification Plan

### Automated Tests
- Backend projesi derlenip testleri çalıştırılacak:
  ```powershell
  mvn clean test
  ```

### Manual Verification
1. Veritabanı migrasyonlarının sorunsuz tamamlandığı ve `bus_routes` vb. tabloların silindiği doğrulanacak.
2. Admin portalı local'de (`npm run dev`) açılacak:
   - Sidebar'dan "Ulaşım Hatları" seçeneğinin kaybolduğu görülecek.
   - İhbar detay ekranında yeni görevli atama arayüzü test edilecek. Personel arama, departmana göre filtreleme ve görevliyi başarıyla değiştirme fonksiyonları doğrulanacak.
3. Mobil uygulama local'de test edilecek:
   - "Kentim" sekmesinde "Otobüs Seferleri" kartının yer almadığı doğrulanacak.
