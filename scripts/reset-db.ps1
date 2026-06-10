# Kentiva — yerel PostgreSQL veritabanını sıfırlar (yalnızca dev).
# Flyway migration + dev-migration backend açılınca yeniden uygulanır.
#
# Kullanım:
#   .\scripts\reset-db.ps1
#   .\scripts\reset-db.ps1 -RestartBackend
#   .\scripts\reset-db.ps1 -ClearUploads

param(
    [switch]$RestartBackend,
    [switch]$ClearUploads,
    [switch]$NoConfirm
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'local-test-common.ps1')

$root = Get-ProjectRoot
$envFile = Join-Path $root '.env'

$dbHost = 'localhost'
$dbPort = 5432
$dbName = 'belediyeapp'
$dbUser = 'postgres'
$dbPassword = ''

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"').Trim("'")
            switch ($key) {
                'DB_USERNAME' { $dbUser = $val }
                'DB_PASSWORD' { $dbPassword = $val }
                'PGUSER' { if ($val) { $dbUser = $val } }
                'PGPASSWORD' { if ($val) { $dbPassword = $val } }
                'PGHOST' { if ($val) { $dbHost = $val } }
                'PGPORT' { if ($val) { $dbPort = [int]$val } }
                'PGDATABASE' { if ($val) { $dbName = $val } }
                'BELEDIYE_DB_URL' {
                    if ($val -match 'jdbc:postgresql://([^:/]+)(?::(\d+))?/([^?]+)') {
                        $dbHost = $matches[1]
                        if ($matches[2]) { $dbPort = [int]$matches[2] }
                        $dbName = $matches[3]
                    }
                }
            }
        }
    }
}

$psql = @(
    'C:\Program Files\PostgreSQL\18\bin\psql.exe',
    'C:\Program Files\PostgreSQL\17\bin\psql.exe',
    'C:\Program Files\PostgreSQL\16\bin\psql.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $psql) {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { $psql = $cmd.Source }
}
if (-not $psql) {
    throw 'psql bulunamadı. PostgreSQL bin klasörünü PATH''e ekleyin veya PostgreSQL 16+ kurun.'
}

if (-not (Test-PostgresPort -Port $dbPort)) {
    throw "PostgreSQL dinlemiyor ($dbHost`:$dbPort)."
}

Write-Host ''
Write-Host 'UYARI: belediyeapp veritabanındaki TÜM veriler silinecek.' -ForegroundColor Yellow
Write-Host "  Hedef: $dbHost`:$dbPort / $dbName" -ForegroundColor DarkGray
if (-not $NoConfirm) {
    $answer = Read-Host 'Devam? (evet yazın)'
    if ($answer -notin @('evet', 'Evet', 'EVET')) {
        Write-Host 'İptal edildi.' -ForegroundColor DarkGray
        exit 0
    }
}

# Backend bağlantılarını kes
$conn = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    Write-Host 'Backend durduruluyor (8080)...' -ForegroundColor Cyan
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

$env:PGPASSWORD = $dbPassword
$sql = @'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
'@

Write-Host 'Şema sıfırlanıyor...' -ForegroundColor Cyan
& $psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -v ON_ERROR_STOP=1 -c $sql
if ($LASTEXITCODE -ne 0) {
    throw 'psql şema sıfırlama başarısız.'
}
Write-Host 'Veritabanı temizlendi. Flyway migration''ları backend başlayınca yeniden uygulanacak.' -ForegroundColor Green

if ($ClearUploads) {
    $uploadDir = Join-Path $root 'uploads'
    if (Test-Path $uploadDir) {
        Remove-Item -Path (Join-Path $uploadDir '*') -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Yerel yüklemeler temizlendi: $uploadDir" -ForegroundColor Green
    }
}

if ($RestartBackend) {
    Write-Host 'Backend başlatılıyor (dev profil)...' -ForegroundColor Cyan
    $mvnArgs = @(
        'clean', 'spring-boot:run',
        '"-Dspring-boot.run.profiles=dev"',
        '"-Dmaven.test.skip=true"'
    )
    if ($NoNewWindows) {
        Write-Host "  Manuel: cd backend; .\mvnw.cmd $($mvnArgs -join ' ')" -ForegroundColor Yellow
    } else {
        Start-Process powershell -ArgumentList @(
            '-NoExit', '-Command',
            "cd '$(Join-Path $root 'backend')'; .\mvnw.cmd $($mvnArgs -join ' ')"
        ) -WindowStyle Normal
    }
    Wait-BackendHealth -BaseUrl 'http://localhost:8080'
    Write-Host ''
    Write-Host 'İlk kurulum: http://localhost:5173/setup' -ForegroundColor Cyan
    Write-Host 'Dev süper admin (dev-migration): admin@kentiva.app / admin123' -ForegroundColor DarkGray
}
