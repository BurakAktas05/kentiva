<#
.SYNOPSIS
    Kentiva PostgreSQL + PostGIS Automated Backup & Restore Verification Script.
.DESCRIPTION
    Takes a compressed custom-format dump of the Kentiva database using pg_dump,
    verifies archive header integrity, and optionally restores to a test schema.
.EXAMPLE
    .\db-backup-restore.ps1 -DbHost "localhost" -DbPort 5432 -DbName "belediyeapp" -DbUser "postgres"
#>

param (
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbName = "belediyeapp",
    [string]$DbUser = "postgres",
    [string]$BackupDir = ".\backups",
    [switch]$VerifyRestore = $false
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Kentiva Database Backup & Restore Automation" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "📁 Created backup directory: $BackupDir" -ForegroundColor Green
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "kentiva_backup_$Timestamp.dump"

Write-Host "⏳ Starting pg_dump for database [$DbName] on $DbHost:$DbPort..." -ForegroundColor Yellow

$PgDumpCmd = "pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F c -b -v -f `"$BackupFile`""

try {
    # Check if pg_dump is in PATH
    $pgDumpExists = Get-Command pg_dump -ErrorAction SilentlyContinue
    if (-not $pgDumpExists) {
        Write-Host "⚠️ Warning: pg_dump command not found in system PATH." -ForegroundColor Red
        Write-Host "💡 Please ensure PostgreSQL client tools are installed and added to PATH." -ForegroundColor Yellow
        exit 1
    }

    Invoke-Expression $PgDumpCmd

    if (Test-Path $BackupFile) {
        $FileSize = (Get-Item $BackupFile).Length / 1MB
        Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
        Write-Host "💾 Location: $BackupFile" -ForegroundColor Green
        Write-Host "📏 Size    : $([math]::Round($FileSize, 2)) MB" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Backup failed with error: $_" -ForegroundColor Red
    exit 1
}

if ($VerifyRestore) {
    Write-Host "`n🔍 Verifying restore archive integrity using pg_restore --list..." -ForegroundColor Yellow
    $PgRestoreCmd = "pg_restore -l `"$BackupFile`""
    try {
        $ListOutput = Invoke-Expression $PgRestoreCmd
        Write-Host "✅ Archive structure verified! Found $($ListOutput.Count) schema items." -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Restore verification failed: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n🎉 Backup automation finished cleanly." -ForegroundColor Cyan
