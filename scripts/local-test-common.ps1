# Kentiva — yerel geliştirme yardımcıları (dot-source)
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
    if (-not (Test-Path (Join-Path (Join-Path $root 'backend') 'mvnw.cmd'))) {
        $missing += "mvnw.cmd bulunamadı under backend directory"
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

function Write-FrontendEnvFiles {
    param([string]$ProjectRoot)
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
    $citizenEnv = @(
        '# scripts/start-local.ps1',
        'VITE_API_BASE_URL=http://localhost:8080/api/v1'
    ) -join "`n"
    Set-Content -Path (Join-Path $ProjectRoot 'admin-portal\.env.local') -Value $adminEnv -Encoding utf8
    Set-Content -Path (Join-Path $ProjectRoot 'public-site\.env.local') -Value $publicEnv -Encoding utf8
    Set-Content -Path (Join-Path (Get-CitizenAppDir) '.env.local') -Value $citizenEnv -Encoding utf8
    Write-Host 'Yazıldı: admin-portal / public-site / vatandaş .env.local' -ForegroundColor Green
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
    Start-Process powershell -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $psCmd) | Out-Null
    Write-Host "Açıldı: $Title" -ForegroundColor Green
}

function Start-SpringBootWindow {
    param([string]$ProjectRoot)
    $cmd = '.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"'
    Start-DevServerWindow -Title 'Kentiva Backend (8080)' -WorkingDirectory (Join-Path $ProjectRoot 'backend') -Command $cmd
}

function Start-FrontendWindows {
    param([string]$ProjectRoot)
    Start-DevServerWindow -Title 'Admin Portal (5173)' -WorkingDirectory (Join-Path $ProjectRoot 'admin-portal') -Command 'npm run dev'
    Start-DevServerWindow -Title 'Public Site' -WorkingDirectory (Join-Path $ProjectRoot 'public-site') -Command 'npm run dev'
    Start-DevServerWindow -Title 'Citizen App (3000)' -WorkingDirectory (Get-CitizenAppDir) -Command 'npm run dev'
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
