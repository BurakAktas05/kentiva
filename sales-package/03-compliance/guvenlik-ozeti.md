# Kentiva Güvenlik ve Uyumluluk Brifi (Belediye IT)

## Mimari özet

- **Multi-tenant:** Belediye verisi `municipality_id` ile izole; istemciden gelen belediye ID’sine güvenilmez.
- **Kimlik:** JWT, rol bazlı yetki (admin, birim yöneticisi, saha, Beyaz Masa, süper admin).
- **API:** DTO doğrulama, rate limiting, tutarlı hata yapısı.
- **Medya:** Güvenilmeyen yükleme; KVKK anonimleştirme (yüz/plaka) asenkron.
- **Denetim:** Kritik işlemler audit log.
- **Altyapı:** PostgreSQL + PostGIS + pgvector, Redis, nesne depolama (S3 uyumlu).

## KVKK

- Veri işleme eki: `03-compliance/kvkk-veri-isleme-eki.md`
- Vatandaş onayı (ihbar akışı)
- Yetkisiz erişim ve tenant sızıntısı testleri ürün geliştirme kurallarında zorunlu

## Operasyon

- Ortam sırları repoya konmaz
- Prod kontrol listesi: `deployment/PROD-CHECKLIST.md`
- Yayınlama: `deployment/YAYINLAMA.md`

## IT’ye sorulacaklar (satış)

1. Mevcut MIS var mı? (Enterprise entegrasyon)
2. SSO / kurumsal e-posta politikası?
3. Veri saklama süresi tercihi?
4. IP kısıtı / VPN gereksinimi?
