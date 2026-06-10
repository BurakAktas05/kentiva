# Kentiva — Yerel manuel test adımları 1–5 (APK YOK)
#
# Sıra: PostgreSQL → Backend → Tünel → Admin + Public
# APK (adım 6): .\scripts\build-apk-local.ps1  (tünel doğrulandıktan SONRA)
#
# Kullanım:
#   .\scripts\start-local.ps1
#   .\scripts\start-local.ps1 -TunnelProvider ngrok
#   .\scripts\start-local.ps1 -SkipTunnel

param(
    [ValidateSet('auto', 'ngrok', 'localtunnel')]
    [string]$TunnelProvider = 'auto',
    [int]$BackendPort = 8080,
    [switch]$SkipBackend,
    [switch]$SkipTunnel,
    [switch]$SkipFrontends,
    [switch]$NoNewWindows
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'local-test-common.ps1')

Write-LocalTestBanner 'Kentiva — Yerel test (1–5, APK en sonda değil)'

$root = Get-ProjectRoot
Assert-LocalTestPrerequisites

# [1] PostgreSQL
Write-Host '[1/5] PostgreSQL (5432)...' -ForegroundColor Cyan
if (-not (Test-PostgresPort)) {
    Write-Host '  UYARI: 5432 kapalı. PostgreSQL + belediyeapp + PostGIS başlatın.' -ForegroundColor Yellow
    Read-Host '  Hazır olunca Enter'
} else {
    Write-Host '  PostgreSQL erişilebilir.' -ForegroundColor Green
}

if (-not (Test-Path (Join-Path $root '.env'))) {
    if (Test-Path (Join-Path $root '.env.example')) {
        Copy-Item (Join-Path $root '.env.example') (Join-Path $root '.env')
        Write-Host '  .env.example -> .env kopyalandı. JWT_SECRET ve DB şifresini doldurun.' -ForegroundColor Yellow
    }
}

Write-FrontendEnvFiles -ProjectRoot $root

# [2] Backend
Write-Host '[2/5] Spring Boot (dev profil)...' -ForegroundColor Cyan
if (-not $SkipBackend) {
    if ($NoNewWindows) {
        Write-Host '  Manuel: cd backend; .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"' -ForegroundColor Yellow
    } else {
        Start-SpringBootWindow -ProjectRoot $root
    }
    Wait-BackendHealth -BaseUrl "http://localhost:$BackendPort"
} else {
    Wait-BackendHealth -BaseUrl "http://localhost:$BackendPort"
}

# [3] Tünel
$tunnelBase = $null
if (-not $SkipTunnel) {
    Write-Host '[3/5] HTTPS tünel (telefon / APK API)...' -ForegroundColor Cyan
    $t = Start-PublicTunnel -Provider $TunnelProvider -Port $BackendPort
    $tunnelBase = $t.Url
    $apiBase = "$tunnelBase/api/v1"
    Save-TunnelState -PublicBaseUrl $tunnelBase -Provider $t.Provider -ApiBaseUrl $apiBase

    $envPath = Join-Path $root '.env'
    if (Test-Path $envPath) {
        Set-EnvFileValue -FilePath $envPath -Key 'APP_PUBLIC_URL' -Value $tunnelBase
    }

    Write-MobileEnvFile -ProjectRoot $root -ApiBaseUrl $apiBase

    Write-Host "  Tünel: $tunnelBase" -ForegroundColor Green
    Write-Host "  Kayıt: $(Get-TunnelUrlFilePath)" -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  >>> Tüneli doğrulayın (200 / UP olmadan APK derlemeyin):' -ForegroundColor Yellow
    Write-Host "      $tunnelBase/actuator/health" -ForegroundColor White
    Write-Host ''
    Write-Host '  Medya önizlemesi için: backend penceresini kapatıp yeniden başlatın' -ForegroundColor DarkGray
    Write-Host '  (APP_PUBLIC_URL .env içinde güncellendi).' -ForegroundColor DarkGray
} else {
    Write-Host '[3/5] Tünel atlandı (-SkipTunnel).' -ForegroundColor Yellow
    $tunnelBase = Read-TunnelBaseUrl
    if ($tunnelBase) {
        Write-Host "  Mevcut tunnel-url.txt: $tunnelBase" -ForegroundColor Gray
    }
}

# [4–5] Frontends
if (-not $SkipFrontends -and -not $NoNewWindows) {
    Write-Host '[4/5] Admin panel...' -ForegroundColor Cyan
    Write-Host '[5/5] Kamu sitesi...' -ForegroundColor Cyan
    $adminDir = Join-Path $root 'admin-portal'
    $publicDir = Join-Path $root 'public-site'
    foreach ($dir in @($adminDir, $publicDir)) {
        if (-not (Test-Path (Join-Path $dir 'node_modules'))) {
            Push-Location $dir
            npm install
            Pop-Location
        }
    }
    Start-DevServerWindow -Title 'Admin + Süper Admin (5173)' -WorkingDirectory $adminDir -Command 'npm run dev'
    Start-DevServerWindow -Title 'Kamu sitesi (5174)' -WorkingDirectory $publicDir -Command 'npm run dev'
}

Write-Host ''
Write-LocalTestBanner 'Adımlar 1–5 tamam'
Write-Host '  Kurulum : http://localhost:5173/setup' -ForegroundColor White
Write-Host '  Giriş   : http://localhost:5173/login' -ForegroundColor White
Write-Host '  Kamu    : http://localhost:5174/' -ForegroundColor White
Write-Host '  Dev SA  : admin@kentiva.app / admin123' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  [6] APK (EN SON — tünel doğrulandıktan sonra):' -ForegroundColor Cyan
Write-Host '      .\scripts\build-apk-local.ps1' -ForegroundColor White
Write-Host ''
Write-Host '  Rehber: scripts\YEREL-MANUEL-TEST.md' -ForegroundColor DarkGray
if ($tunnelBase) {
    Write-Host "  Sağlık: .\scripts\check-backend-health.ps1 -BaseUrl `"$tunnelBase`"" -ForegroundColor DarkGray
}
