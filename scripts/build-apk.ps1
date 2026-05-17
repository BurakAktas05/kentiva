# Kentiva — Android APK derleme yardımcısı
# Kullanım:
#   .\scripts\build-apk.ps1 -ApiBaseUrl "https://YOUR.up.railway.app/api/v1"
#   .\scripts\build-apk.ps1 -ApiBaseUrl "https://..." -Release
#
param(
    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl,
    [switch]$Release
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $root "belediyehattı"
$envFile = Join-Path $appDir ".env"

if (-not (Test-Path $appDir)) {
    Write-Error "belediyehattı klasörü bulunamadı: $appDir"
}

$lines = @(
    "# Üretim API — build-apk.ps1 tarafından yazıldı",
    "VITE_API_BASE_URL=$ApiBaseUrl"
)
Set-Content -Path $envFile -Value ($lines -join "`n") -Encoding utf8
Write-Host "Yazıldı: $envFile" -ForegroundColor Green
Write-Host "CAPACITOR_DEV_SERVER_URL tanımlanmadı (üretim modu)." -ForegroundColor Cyan

Push-Location $appDir
try {
    if (-not (Test-Path "node_modules")) {
        npm install
    }
    npm run build:native
    if ($Release) {
        Push-Location android
        .\gradlew.bat assembleRelease
        Write-Host "Release APK: android\app\build\outputs\apk\release\" -ForegroundColor Green
        Pop-Location
    } else {
        Push-Location android
        .\gradlew.bat assembleDebug
        Write-Host "Debug APK: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Green
        Pop-Location
    }
} finally {
    Pop-Location
}
