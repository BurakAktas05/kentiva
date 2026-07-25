# Rollback ve olay müdahalesi

Canlıda regresyon veya kesinti olduğunda izlenecek minimum plan.

## 1. Hızlı karar ağacı

| Semptom | İlk eylem |
|---------|-----------|
| API ayağa kalkmıyor | Son deploy’u geri al; `SPRING_PROFILES_ACTIVE=prod` ve env’leri kontrol et |
| Sadece frontend kırık | İlgili Vercel projesinde önceki deployment’ı Promote |
| Medya yükleme kırık | Media Guard + S3 + fail-closed bayrakları; geçici feature kapatma yoksa upload’ı durdur |
| Auth / OTP kırık | NetGSM durumu; OTP bypass’ı **asla** production’da açma |
| Veri bozulması şüphesi | Yazmayı durdur → yedekten restore tatbikatına geç |

## 2. Uygulama rollback

### Backend (Railway)

1. Railway → Deployments → son bilinen iyi sürümü **Redeploy**.
2. Alternatif: bilinen iyi Git SHA’ya tag atıp o imajı deploy edin.
3. Doğrula:

```bash
curl -sS https://<API_HOST>/actuator/health/readiness
```

### Admin / public / citizen (Vercel)

1. Vercel → Project → Deployments
2. Son iyi production deployment → **Promote to Production**
3. Hard refresh ile CORS ve API base’i doğrula

### Mobil

- Play / App Store staged rollout varsa yüzdesini düşürün veya önceki sürüme çekin.
- Acil web/API düzeltmesi çoğu zaman uygulamadan bağımsız yeterlidir.

## 3. Veritabanı

- Flyway migration’ları **geri alınmaz**; ileriye dönük düzeltme migration’ı yazılır.
- Schema hatası / kötü veri:
  1. Uygulamayı önceki API sürümüne al (eski kod yeni şemayı okuyabilmeli — bu yüzden migration’lar geriye uyumlu olmalı).
  2. Gerekirse yedekten **point-in-time / son snapshot restore** (önceden tatbikat yapılmış olmalı).
- `flyway clean` veya elle `DROP` production’da yasak.

## 4. Yapılandırma rollback

Env değişikliği sonrası bozulma:

1. Railway / Vercel Variables’ta önceki değerleri geri yükle.
2. Servisi yeniden başlat / redeploy.
3. Özellikle kontrol et: `APP_CORS_ALLOWED_ORIGINS`, `APP_PUBLIC_URL`, `MEDIA_GUARD_URL`, Redis/Rabbit/S3.

## 5. İletişim şablonu (iç)

```
Olay: <kısa özet>
Etki: <vatandaş / admin / tenant>
Başlangıç: <UTC+3>
Durum: araştırılıyor | azaltıldı | çözüldü
Geçici önlem: <rollback / feature stop>
Sonraki güncelleme: <saat>
```

Belediye iletişimini yalnızca onaylı operasyon sahibi yapar; spekülatif kök neden paylaşılmaz.

## 6. Olay sonrası

- [ ] Zaman çizelgesi yazıldı
- [ ] Kök neden + kalıcı düzeltme ticket’ı açıldı
- [ ] Monitoring / alert eksiği varsa eklendi
- [ ] Checklist / bu runbook güncellendi

## İlgili

- [`PROD-CHECKLIST.md`](PROD-CHECKLIST.md)
- [`YAYINLAMA.md`](YAYINLAMA.md)
- [`MEDIA-GUARD.md`](MEDIA-GUARD.md)
