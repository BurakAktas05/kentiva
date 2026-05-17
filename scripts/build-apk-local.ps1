# Kentiva — Adım 6: Yerel tünel URL ile APK (1–5 ve tünel doğrulaması SONRASI)
#
#   .\scripts\build-apk-local.ps1
#   .\scripts\build-apk-local.ps1 -TunnelUrl "https://xxxx.ngrok-free.app"
#   .\scripts\build-apk-local.ps1 -Release
#   .\scripts\build-apk-local.ps1 -Force   # sağlık kontrolünü atla

param(
    [string]$TunnelUrl,
    [switch]$Release,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'local-test-common.ps1')

$base = Read-TunnelBaseUrl -Override $TunnelUrl
if (-not $base) {
    Write-Host @"

HATA: Tünel URL bulunamadı.
  1) .\scripts\start-local.ps1
  2) https://.../actuator/health ile doğrulayın
  3) .\scripts\build-apk-local.ps1

Veya: -TunnelUrl "https://SUBDOMAIN.ngrok-free.app"

"@ -ForegroundColor Red
    exit 1
}

if ($base -notmatch '^https://') {
    Write-Error 'APK için HTTPS tünel gerekli.'
}

$healthUri = "$base/actuator/health"
Write-Host "Tünel kontrolü: GET $healthUri" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri $healthUri -Method Get -TimeoutSec 25
    if ($health.status -and $health.status -notin @('UP', 'up')) {
        if (-not $Force) { throw "Backend durumu: $($health.status)" }
    }
    Write-Host 'Tünel OK.' -ForegroundColor Green
} catch {
    if (-not $Force) {
        Write-Host "HATA: $_" -ForegroundColor Red
        Write-Host 'Doğruladıysanız: -Force' -ForegroundColor Yellow
        exit 1
    }
    Write-Host 'Uyarı: sağlık kontrolü atlandı (-Force).' -ForegroundColor Yellow
}

$apiUrl = "$base/api/v1"
Write-Host ''
Write-Host "=== APK derleniyor - API: $apiUrl ===" -ForegroundColor Cyan
Write-Host ''

$buildScript = Join-Path $PSScriptRoot 'build-apk.ps1'
if ($Release) {
    & $buildScript -ApiBaseUrl $apiUrl -Release
} else {
    & $buildScript -ApiBaseUrl $apiUrl
}
