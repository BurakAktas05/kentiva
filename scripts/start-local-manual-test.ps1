# Kentiva — Yerel manuel test (start-local.ps1 ile ayni)
# Kullanim: .\scripts\start-local-manual-test.ps1
# Detay: scripts\YEREL-MANUEL-TEST.md

& (Join-Path $PSScriptRoot 'start-local.ps1') @args
if ($LASTEXITCODE) { exit $LASTEXITCODE }
