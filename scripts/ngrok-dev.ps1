# Eski notlar — güncel akış için:
#   .\scripts\start-local.ps1          (DB → backend → tünel → admin + public, APK YOK)
#   .\scripts\build-apk-local.ps1      (tünel doğrulandıktan SONRA)
#   scripts\YEREL-MANUEL-TEST.md

Write-Host "Bu dosya bilgilendirme amaçlıdır." -ForegroundColor Cyan
Write-Host ""
Write-Host "Yerel manuel test:" -ForegroundColor Green
Write-Host "  1) .\scripts\start-local.ps1"
Write-Host "  2) Tünel: https://.../actuator/health doğrula"
Write-Host "  3) .\scripts\build-apk-local.ps1   (APK en sonda)"
Write-Host ""
Write-Host "Ayrıntı: scripts\YEREL-MANUEL-TEST.md" -ForegroundColor Yellow
