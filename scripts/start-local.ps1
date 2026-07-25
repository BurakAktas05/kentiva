# Kentiva — Yerel geliştirme (Docker veya native)
#
# Kullanım:
#   .\scripts\start-local.ps1
#   .\scripts\start-local.ps1 -SkipFrontends
#
# Üretim için tünel (ngrok vb.) kullanılmaz. Canlıya çıkış:
#   deployment/YAYINLAMA.md

param(
    [int]$BackendPort = 8080,
    [switch]$SkipBackend,
    [switch]$SkipFrontends,
    [switch]$NoNewWindows
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'local-test-common.ps1')

Write-LocalTestBanner 'Kentiva — Yerel geliştirme'

$root = Get-ProjectRoot
Assert-LocalTestPrerequisites

Write-Host '[1/3] PostgreSQL (5432)...' -ForegroundColor Cyan
if (-not (Test-PostgresPort)) {
    Write-Host '  UYARI: 5432 kapalı. docker compose veya yerel PostgreSQL + PostGIS başlatın.' -ForegroundColor Yellow
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

Write-Host '[2/3] Spring Boot (dev profil)...' -ForegroundColor Cyan
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

Write-Host '[3/3] Frontends...' -ForegroundColor Cyan
if (-not $SkipFrontends) {
    if ($NoNewWindows) {
        Write-Host '  Manuel: admin-portal + public-site + belediyehattı npm run dev' -ForegroundColor Yellow
    } else {
        Start-FrontendWindows -ProjectRoot $root
    }
}

Write-Host ''
Write-Host 'Hazır:' -ForegroundColor Green
Write-Host "  API        http://localhost:$BackendPort"
Write-Host '  Admin      http://localhost:5173'
Write-Host '  Public     http://localhost:5174 (veya Vite portu)'
Write-Host '  Vatandaş   http://localhost:3000'
Write-Host ''
Write-Host 'Canlı yayın: deployment/YAYINLAMA.md' -ForegroundColor Cyan
