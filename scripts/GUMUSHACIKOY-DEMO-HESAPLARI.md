# Gümüşhacıköy yerel demo hesapları

Bu hesaplar yalnızca `dev`/`docker` profillerinde çalışan
`db/dev-migration/V103__seed_gumushacikoy_demo.sql` tarafından oluşturulur.
Production Flyway yolunda demo hesap veya örnek vatandaş verisi bulunmaz.

Belediye çalışma alanı: `gumushacikoy`
Ortak parola: `KentivaDemo1!`

| Rol | E-posta | Test amacı |
|---|---|---|
| Belediye yöneticisi | `gumushacikoy.admin@kentiva.app` | Belediye ayarları, kullanıcılar, duyurular, anketler ve tüm tenant raporları |
| Beyaz Masa | `gumushacikoy.beyazmasa@kentiva.app` | Yeni ihbarı inceleme ve müdürlüğe yönlendirme |
| Birim müdürü | `gumushacikoy.mudur@kentiva.app` | Fen İşleri kuyruğu ve saha görevlisi atama |
| Saha görevlisi | `gumushacikoy.saha@kentiva.app` | Kendisine atanan işleri görme ve sonuçlandırma |
| Vatandaş | `gumushacikoy.vatandas@kentiva.app` | Mobil ihbar oluşturma, takip, duyuru ve anket akışları |
| İkinci vatandaş | `gumushacikoy.vatandas2@kentiva.app` | Anket sonuçları, bildirimler ve çözülen ihbar geri bildirimi |

Platform genelindeki mevcut yerel süper yönetici hesabı ayrıca
`admin@kentiva.app` / `admin123` olarak kalır.

## Güvenlik notu

Hesaplar sahte telefon numaraları ve `.local` iletişim adresleri kullanır. Ortak
parola yalnızca yerel demo kolaylığı içindir; uygulamayı internete açan veya
production profilini kullanan bir ortamda bu hesaplar oluşturulmamalıdır.

## Beklenen örnek içerik

Seed sonrasında Gümüşhacıköy çalışma alanında altı farklı durumdaki ihbar,
durum geçmişleri, bir çözüm geri bildirimi, belediye duyuruları, iki anket ve
örnek oylar, etkinlikler, planlı kesintiler, bildirimler ve hızlı ihbar
şablonları görünür. Seed sabit kimlikler ve upsert işlemleri kullandığı için
elle tekrar çalıştırıldığında kayıt çoğaltmaz.
