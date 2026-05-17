# Kentiva — yerel manuel test ortak yardımcıları (dot-source)
$ErrorActionPreference = 'Stop'

function Get-ProjectRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Get-CitizenAppDir {
    $root = Get-ProjectRoot
    $match = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'belediyehatt*' } |
        Select-Object -First 1
    if (-not $match) {
        throw "Vatandas uygulama klasoru bulunamadi (belediyehatti*): $root"
    }
    return $match.FullName
}

function Write-LocalTestBanner {
    param([string]$Title)
    Write-Host ''
    Write-Host ('=' * 60) -ForegroundColor DarkCyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ('=' * 60) -ForegroundColor DarkCyan
}

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Assert-LocalTestPrerequisites {
    $missing = @()
    if (-not (Test-CommandExists 'java')) { $missing += 'Java (JDK 21) — PATH''e ekleyin' }
    if (-not (Test-CommandExists 'node')) { $missing += 'Node.js (LTS)' }
    if (-not (Test-CommandExists 'npm')) { $missing += 'npm (Node ile gelir)' }

    $root = Get-ProjectRoot
    if (-not (Test-Path (Join-Path $root 'mvnw.cmd'))) {
        $missing += "mvnw.cmd bulunamadı: $root"
    }

    if ($missing.Count -gt 0) {
        Write-Host 'Eksik önkoşullar:' -ForegroundColor Red
        $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        throw 'Önkoşullar tamamlanmadan devam edilemez.'
    }
}

function Test-PostgresPort {
    param([int]$Port = 5432)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $async = $tcp.BeginConnect('127.0.0.1', $Port, $null, $null)
        $ok = $async.AsyncWaitHandle.WaitOne(2000, $false)
        if ($ok -and $tcp.Connected) {
            $tcp.Close()
            return $true
        }
        $tcp.Close()
    } catch { }
    return $false
}

function Wait-BackendHealth {
    param(
        [string]$BaseUrl = 'http://localhost:8080',
        [int]$TimeoutSec = 180,
        [int]$IntervalSec = 3
    )
    $BaseUrl = $BaseUrl.TrimEnd('/')
    $uri = "$BaseUrl/actuator/health"
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "Backend bekleniyor: $uri" -ForegroundColor Cyan
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 5
            if ($r.status -eq 'UP' -or $r.status -eq 'up') {
                Write-Host 'Backend hazır (UP).' -ForegroundColor Green
                return $true
            }
        } catch { }
        Start-Sleep -Seconds $IntervalSec
    }
    throw "Backend $TimeoutSec sn içinde yanıt vermedi. PostgreSQL ve Spring Boot loglarını kontrol edin."
}

function Get-TunnelStatePath {
    return Join-Path $PSScriptRoot '.local-tunnel.state.json'
}

function Set-EnvFileValue {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$Key,
        [Parameter(Mandatory = $true)][string]$Value
    )
    $lines = @()
    if (Test-Path $FilePath) {
        $lines = Get-Content -Path $FilePath -Encoding utf8
    }
    $pattern = "^\s*$([regex]::Escape($Key))\s*="
    $found = $false
    $out = foreach ($line in $lines) {
        if ($line -match $pattern) {
            $found = $true
            "$Key=$Value"
        } else {
            $line
        }
    }
    if (-not $found) {
        if ($out.Count -gt 0 -and $out[-1] -ne '') { $out += '' }
        $out += "$Key=$Value"
    }
    Set-Content -Path $FilePath -Value $out -Encoding utf8
}

function Get-TunnelUrlFilePath {
    return Join-Path $PSScriptRoot 'tunnel-url.txt'
}

function Save-TunnelState {
    param(
        [string]$PublicBaseUrl,
        [string]$Provider,
        [string]$ApiBaseUrl
    )
    $base = $PublicBaseUrl.TrimEnd('/')
    $state = [ordered]@{
        updatedAt     = (Get-Date).ToString('o')
        provider      = $Provider
        publicBaseUrl = $base
        apiBaseUrl    = $ApiBaseUrl.TrimEnd('/')
    }
    $path = Get-TunnelStatePath
    $state | ConvertTo-Json | Set-Content -Path $path -Encoding utf8
    Set-Content -Path (Get-TunnelUrlFilePath) -Value $base -Encoding utf8 -NoNewline
    return $path
}

function Read-TunnelBaseUrl {
    param([string]$Override = '')
    if ($Override) { return $Override.Trim().TrimEnd('/') }
    $file = Get-TunnelUrlFilePath
    if (Test-Path $file) {
        return (Get-Content $file -Raw).Trim().TrimEnd('/')
    }
    $state = Get-TunnelState
    if ($state -and $state.publicBaseUrl) {
        return $state.publicBaseUrl.TrimEnd('/')
    }
    return $null
}

function Get-TunnelState {
    $path = Get-TunnelStatePath
    if (-not (Test-Path $path)) {
        return $null
    }
    return Get-Content $path -Raw | ConvertFrom-Json
}

function Resolve-TunnelProvider {
    param([ValidateSet('auto', 'ngrok', 'localtunnel')][string]$Preferred = 'auto')
    if ($Preferred -ne 'auto') { return $Preferred }
    if (Test-CommandExists 'ngrok') { return 'ngrok' }
    return 'localtunnel'
}

function Start-NgrokTunnel {
    param([int]$Port = 8080)
    if (-not (Test-CommandExists 'ngrok')) {
        throw 'ngrok bulunamadı. https://ngrok.com/download kurun veya -TunnelProvider localtunnel kullanın.'
    }
    $existing = Get-Process -Name 'ngrok' -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host 'Mevcut ngrok süreci kullanılıyor.' -ForegroundColor Yellow
    } else {
        Start-Process -FilePath 'ngrok' -ArgumentList @('http', "$Port") -WindowStyle Minimized | Out-Null
        Start-Sleep -Seconds 4
    }
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        try {
            $api = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 5
            $https = $api.tunnels | Where-Object { $_.public_url -like 'https://*' } | Select-Object -First 1
            if ($https.public_url) {
                return $https.public_url.TrimEnd('/')
            }
        } catch { Start-Sleep -Seconds 2 }
    }
    throw 'ngrok tünel URL''si alınamadı. http://127.0.0.1:4040 açılıyor mu kontrol edin.'
}

function Start-LocaltunnelTunnel {
    param([int]$Port = 8080)
    $lt = Join-Path $env:TEMP "kentiva-lt-$Port.log"
    $ltErr = Join-Path $env:TEMP "kentiva-lt-$Port.err.log"
    foreach ($f in @($lt, $ltErr)) { if (Test-Path $f) { Remove-Item $f -Force } }
    $npx = if (Test-CommandExists 'npx.cmd') { 'npx.cmd' } else { 'npx' }
    $proc = Start-Process -FilePath $npx -ArgumentList @(
        '--yes', 'localtunnel', '--port', "$Port"
    ) -PassThru -WindowStyle Hidden -RedirectStandardOutput $lt -RedirectStandardError $ltErr
    $deadline = (Get-Date).AddSeconds(60)
    $url = $null
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $lt) {
            $text = Get-Content $lt -Raw -ErrorAction SilentlyContinue
            if ($text -match '(https://[a-z0-9-]+\.loca\.lt)') {
                $url = $Matches[1].TrimEnd('/')
                break
            }
        }
        if ($proc.HasExited -and -not $url) {
            $tail = if (Test-Path $lt) { Get-Content $lt -Tail 20 } else { @() }
            throw "localtunnel başarısız. Çıktı:`n$($tail -join "`n")"
        }
        Start-Sleep -Seconds 2
    }
    if (-not $url) { throw 'localtunnel URL okunamadı.' }
    return $url
}

function Start-PublicTunnel {
    param(
        [ValidateSet('auto', 'ngrok', 'localtunnel')][string]$Provider = 'auto',
        [int]$Port = 8080
    )
    $resolved = Resolve-TunnelProvider -Preferred $Provider
    Write-Host "Tünel sağlayıcı: $resolved (port $Port)" -ForegroundColor Cyan
    switch ($resolved) {
        'ngrok' { return @{ Url = (Start-NgrokTunnel -Port $Port); Provider = 'ngrok' } }
        default { return @{ Url = (Start-LocaltunnelTunnel -Port $Port); Provider = 'localtunnel' } }
    }
}

function Write-MobileEnvFile {
    param(
        [string]$ProjectRoot,
        [string]$ApiBaseUrl
    )
    $citizenDir = Get-CitizenAppDir
    $content = @(
        '# scripts/start-local.ps1 — telefon/APK tünel API',
        "VITE_API_BASE_URL=$ApiBaseUrl"
    ) -join "`n"
    Set-Content -Path (Join-Path $citizenDir '.env.local') -Value $content -Encoding utf8
    Write-Host "Yazıldı: $(Split-Path $citizenDir -Leaf)\.env.local -> $ApiBaseUrl" -ForegroundColor Green
}

function Write-FrontendEnvFiles {
    param(
        [string]$ProjectRoot,
        [string]$MobileApiBaseUrl = ''
    )
    $adminEnv = @(
        '# scripts/start-local.ps1 — localhost API',
        'VITE_API_BASE=http://localhost:8080/api/v1'
    ) -join "`n"
    $publicEnv = @(
        '# scripts/start-local.ps1',
        'VITE_API_BASE=http://localhost:8080/api/v1',
        'VITE_ADMIN_PORTAL_URL=http://localhost:5173',
        'VITE_SITE_URL=http://localhost:5174'
    ) -join "`n"
    Set-Content -Path (Join-Path $ProjectRoot 'admin-portal\.env.local') -Value $adminEnv -Encoding utf8
    Set-Content -Path (Join-Path $ProjectRoot 'public-site\.env.local') -Value $publicEnv -Encoding utf8
    if ($MobileApiBaseUrl) {
        Write-MobileEnvFile -ProjectRoot $ProjectRoot -ApiBaseUrl $MobileApiBaseUrl
    }
    Write-Host 'Yazıldı: admin-portal\.env.local, public-site\.env.local' -ForegroundColor Green
}

function Start-DevServerWindow {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )
    $escapedDir = $WorkingDirectory.Replace("'", "''")
    $escapedCmd = $Command.Replace("'", "''")
    $psCmd = "Set-Location '$escapedDir'; Write-Host '$Title' -ForegroundColor Cyan; $escapedCmd"
    Start-Process powershell -ArgumentList @('-NoExit', '-Command', $psCmd) | Out-Null
    Write-Host "Açıldı: $Title" -ForegroundColor Green
}

function Start-SpringBootWindow {
    param(
        [string]$ProjectRoot,
        [string]$PublicBaseUrl = '',
        [string]$ExtraCors = ''
    )
    $envLines = @()
    if ($PublicBaseUrl) {
        $envLines += "`$env:APP_PUBLIC_URL='$($PublicBaseUrl.TrimEnd('/'))'"
    }
    $defaultCors = 'http://localhost:5173,http://localhost:3000,http://localhost:5174,https://localhost'
    if ($ExtraCors) {
        $envLines += "`$env:APP_CORS_ALLOWED_ORIGINS='$defaultCors,$ExtraCors'"
    }
    $envBlock = if ($envLines.Count) { ($envLines -join '; ') + '; ' } else { '' }
    $cmd = "${envBlock}.\mvnw.cmd spring-boot:run `"-Dspring-boot.run.profiles=dev`""
    Start-DevServerWindow -Title 'Kentiva Backend (8080)' -WorkingDirectory $ProjectRoot -Command $cmd
}

function Test-AndroidSdk {
    $candidates = @(
        $env:ANDROID_HOME,
        $env:ANDROID_SDK_ROOT,
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
    ) | Where-Object { $_ -and (Test-Path $_) }

    foreach ($sdk in $candidates) {
        if (Test-Path (Join-Path $sdk 'platform-tools\adb.exe')) {
            return @{ Ok = $true; SdkRoot = $sdk }
        }
    }

    $localProps = Join-Path (Get-CitizenAppDir) 'android\local.properties'
    if (Test-Path $localProps) {
        $content = Get-Content $localProps -Raw
        if ($content -match 'sdk\.dir=(.+)') {
            $dir = $Matches[1].Trim() -replace '\\\\', '\'
            if (Test-Path $dir) { return @{ Ok = $true; SdkRoot = $dir } }
        }
    }
    return @{ Ok = $false; SdkRoot = $null }
}
