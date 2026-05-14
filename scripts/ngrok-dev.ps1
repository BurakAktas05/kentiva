# Ngrok ile backend (8080) disa acilir; admin + public site yerelde kalir.
#
# 1) Proje kokunde .env icinde ayarla (ngrok acildiktan SONRA ayni https kokunu yaz):
#    APP_PUBLIC_URL=https://XXXX.ngrok-free.app
#    (Bos birakilirsa yukleme yaniti /uploads/... goreli kalir; APK onizlemesi bozulabilir.)
#
# 2) Backend: belediyeapp klasorunden
#    .\mvnw.cmd spring-boot:run
#
# 3) Baska terminalde (ngrok kurulu olmali):
#    ngrok http 8080
#
# 4) Mobil derleme (belediyehatti):
#    belediyehatti\.env dosyasi olustur:
#    VITE_API_BASE_URL=https://XXXX.ngrok-free.app/api/v1
#    Sonra: npm run build; npx cap sync android; android\gradlew.bat assembleDebug
#
# 5) Admin: admin-portal -> VITE_API_BASE=http://localhost:8080/api/v1 (degismez)
#    Public: public-site -> VITE_PUBLIC_API_BASE=http://localhost:8080/api/v1 (degismez)
#
Write-Host "Yukaridaki adimlari .env ve ngrok ciktisina gore uygula." -ForegroundColor Cyan
