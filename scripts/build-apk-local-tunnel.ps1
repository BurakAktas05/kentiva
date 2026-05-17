# Kentiva — Tünel URL ile APK (build-apk-local.ps1 ile ayni)
# Kullanim: .\scripts\build-apk-local-tunnel.ps1
# -TunnelUrl parametresi build-apk-local.ps1'e iletilir.

param(
    [string]$TunnelBaseUrl = '',
    [string]$TunnelUrl = '',
    [switch]$Release,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$url = if ($TunnelUrl) { $TunnelUrl } elseif ($TunnelBaseUrl) { $TunnelBaseUrl } else { '' }

$argsList = @()
if ($url) { $argsList += '-TunnelUrl'; $argsList += $url }
if ($Release) { $argsList += '-Release' }
if ($Force) { $argsList += '-Force' }

& (Join-Path $PSScriptRoot 'build-apk-local.ps1') @argsList
exit $LASTEXITCODE
