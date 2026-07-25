# Kentiva - Android APK derleme yardımcısı
# Kullanım:
#   .\scripts\build-apk.ps1 -ApiBaseUrl "https://api.kentiva.app/api/v1"
#   .\scripts\build-apk.ps1 -ApiBaseUrl "https://api.kentiva.app/api/v1" -Release
#
param(
    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl,
    [switch]$Release
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot 'local-test-common.ps1')

$appDir = Get-CitizenAppDir
$envFile = Join-Path $appDir ".env"
$androidDir = Join-Path $appDir "android"
$gradlew = Join-Path $androidDir "gradlew.bat"

if (-not (Test-Path $appDir)) {
    Write-Host "HATA: vatandas uygulama klasoru bulunamadi." -ForegroundColor Red
    exit 1
}

if (-not $ApiBaseUrl.StartsWith('https://', [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "UYARI: API adresi HTTPS degil. Release APK ve bazi cihazlarda baglanti reddedilebilir." -ForegroundColor Yellow
}

$sdk = Test-AndroidSdk
if (-not $sdk.Ok) {
    Write-Host ""
    Write-Host "HATA: Android SDK bulunamadi." -ForegroundColor Red
    Write-Host "  1) Android Studio kurun (SDK 36 onerilir)" -ForegroundColor Yellow
    Write-Host "  2) ANDROID_HOME ortam degiskenini SDK kokune ayarlayin" -ForegroundColor Yellow
    Write-Host "     veya belediyehatti\android\local.properties icinde sdk.dir=..." -ForegroundColor Yellow
    Write-Host "  3) JDK 21 PATH'te olsun" -ForegroundColor Yellow
    Write-Host "  4) Tekrar: .\scripts\build-apk.ps1 -ApiBaseUrl `"$ApiBaseUrl`"" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $gradlew)) {
    Write-Host "HATA: Gradle wrapper yok. Once: cd belediyehatti; npx cap add android" -ForegroundColor Red
    exit 1
}

$lines = @(
    "# API - build-apk.ps1 tarafindan yazildi",
    "VITE_API_BASE_URL=$ApiBaseUrl"
)
Set-Content -Path $envFile -Value ($lines -join "`n") -Encoding utf8
Write-Host "Yazildi: $envFile" -ForegroundColor Green
Write-Host "CAPACITOR_DEV_SERVER_URL tanimlanmadi (paketlenmis dist modu)." -ForegroundColor Cyan

Push-Location $appDir
try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "npm install..." -ForegroundColor Cyan
        npm install
    }
    Write-Host "Vite + Capacitor sync..." -ForegroundColor Cyan
    npm run build:native
    if ($LASTEXITCODE -ne 0) { throw "npm run build:native basarisiz (cikis $LASTEXITCODE)" }

    Push-Location $androidDir
    try {
        if ($Release) {
            # ── Keystore güvenlik kontrolü ──────────────────────
            # Keystore bilgileri environment variable'lardan alınır.
            # Hardcoded şifre veya dosya yolu kullanmak güvenlik açığı oluşturur.
            $keystorePath = $env:KENTIVA_KEYSTORE_PATH
            $keystorePassword = $env:KENTIVA_KEYSTORE_PASSWORD
            $keyAlias = $env:KENTIVA_KEY_ALIAS
            $keyPassword = $env:KENTIVA_KEY_PASSWORD

            $missingVars = @()
            if (-not $keystorePath)     { $missingVars += "KENTIVA_KEYSTORE_PATH" }
            if (-not $keystorePassword) { $missingVars += "KENTIVA_KEYSTORE_PASSWORD" }
            if (-not $keyAlias)         { $missingVars += "KENTIVA_KEY_ALIAS" }
            if (-not $keyPassword)      { $missingVars += "KENTIVA_KEY_PASSWORD" }

            if ($missingVars.Count -gt 0) {
                Write-Host "" -ForegroundColor Red
                Write-Host "HATA: Release APK icin asagidaki ortam degiskenleri eksik:" -ForegroundColor Red
                foreach ($var in $missingVars) {
                    Write-Host "  - $var" -ForegroundColor Yellow
                }
                Write-Host "" -ForegroundColor Yellow
                Write-Host "Ornek kullanim:" -ForegroundColor Cyan
                Write-Host '  $env:KENTIVA_KEYSTORE_PATH = "C:\keys\kentiva-release.jks"' -ForegroundColor White
                Write-Host '  $env:KENTIVA_KEYSTORE_PASSWORD = "guclu-sifre-buraya"' -ForegroundColor White
                Write-Host '  $env:KENTIVA_KEY_ALIAS = "kentiva"' -ForegroundColor White
                Write-Host '  $env:KENTIVA_KEY_PASSWORD = "guclu-sifre-buraya"' -ForegroundColor White
                exit 1
            }

            if (-not (Test-Path $keystorePath)) {
                Write-Host "HATA: Keystore dosyasi bulunamadi: $keystorePath" -ForegroundColor Red
                exit 1
            }

            # Gradle properties dosyasında hardcoded olup olmadığını kontrol et
            $gradleProps = Join-Path $androidDir "gradle.properties"
            if (Test-Path $gradleProps) {
                $propsContent = Get-Content $gradleProps -Raw
                if ($propsContent -match "storePassword\s*=" -or $propsContent -match "keyPassword\s*=") {
                    Write-Host "UYARI: gradle.properties icinde hardcoded sifre tespit edildi!" -ForegroundColor Yellow
                    Write-Host "  Guvenlik icin sifreleri ortam degiskenlerine tasiyiniz." -ForegroundColor Yellow
                }
            }

            Write-Host "Release APK derleniyor (env-based keystore)..." -ForegroundColor Cyan
            & .\gradlew.bat assembleRelease `
                "-PkentivaStoreFile=$keystorePath" `
                "-PkentivaStorePassword=$keystorePassword" `
                "-PkentivaKeyAlias=$keyAlias" `
                "-PkentivaKeyPassword=$keyPassword"
            $apk = Join-Path $androidDir "app\build\outputs\apk\release"
        } else {
            Write-Host "Debug APK derleniyor..." -ForegroundColor Cyan
            & .\gradlew.bat assembleDebug
            $apkFile = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
        }
        if ($LASTEXITCODE -ne 0) {
            throw "Gradle derlemesi basarisiz (cikis $LASTEXITCODE)"
        }
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}

Write-Host ""
if ($Release) {
    Write-Host "Release APK klasoru:" -ForegroundColor Green
    Write-Host "  $apk" -ForegroundColor White
} else {
    Write-Host "Debug APK hazir:" -ForegroundColor Green
    Write-Host "  $apkFile" -ForegroundColor White
    if (Test-Path $apkFile) {
        $sizeMb = [math]::Round((Get-Item $apkFile).Length / 1MB, 2)
        Write-Host "  Boyut: ${sizeMb} MB" -ForegroundColor DarkGray
    }
}
Write-Host ""
Write-Host "Telefona yukleyin. API: $ApiBaseUrl" -ForegroundColor Cyan
