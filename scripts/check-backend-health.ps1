# Railway / production backend sağlık kontrolü
# Kullanım: .\scripts\check-backend-health.ps1 -BaseUrl "https://YOUR.up.railway.app"
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
)

$BaseUrl = $BaseUrl.TrimEnd("/")
$uri = "$BaseUrl/actuator/health"
Write-Host "GET $uri" -ForegroundColor Cyan
try {
    $r = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 30
    $r | ConvertTo-Json -Depth 5
    Write-Host "OK" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "HATA: $_" -ForegroundColor Red
    exit 1
}
