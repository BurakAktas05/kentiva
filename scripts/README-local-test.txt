Kentiva — Yerel manuel test (Windows, APK EN SONDA)
===================================================

SIRA (önemli)
-------------
1) PostgreSQL + PostGIS (belediyeapp)
2) .\scripts\start-local.ps1          → backend + tünel + admin + public
3) Tünel doğrula: https://XXXX/actuator/health  (UP olmalı)
4) PC: http://localhost:5173  (admin / süper admin)
5) PC: http://localhost:5174  (kamu sitesi)
6) .\scripts\build-apk-local.ps1    → APK (tunnel-url.txt veya -TunnelUrl)

APK bu scriptte YOK: start-local.ps1

ÇIKTILAR
--------
  Tünel URL : scripts\tunnel-url.txt
  Debug APK : belediyehattı\android\app\build\outputs\apk\debug\app-debug.apk

Türkçe ayrıntı: scripts\YEREL-MANUEL-TEST.md
