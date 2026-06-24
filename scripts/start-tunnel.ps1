$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'local-test-common.ps1')

Write-Host "Starting public tunnel..." -ForegroundColor Cyan
$t = Start-PublicTunnel -Provider ngrok -Port 8080
$url = $t.Url

Write-Host "Tunnel URL generated: $url" -ForegroundColor Green

$statePath = Save-TunnelState -PublicBaseUrl $url -Provider $t.Provider -ApiBaseUrl ($url + '/api/v1')
Set-EnvFileValue -FilePath (Join-Path (Get-ProjectRoot) '.env') -Key 'APP_PUBLIC_URL' -Value $url
Write-MobileEnvFile -ProjectRoot (Get-ProjectRoot) -ApiBaseUrl ($url + '/api/v1')

Write-Host "Tunnel started successfully." -ForegroundColor Green
Write-Host "NEW_TUNNEL: $url"
