# Kentiva Fiyat Politikası

**Sürüm:** 2026-07 · **Para birimi:** TRY (KDV hariç) · **Lisans:** Belediye (tenant) başına aylık SaaS

Bu belge public site (`#fiyatlandirma`), admin `/pricing` ve satış tekliflerinin tek kaynağıdır.

---

## 1. Ticari model

| İlke | Uygulama |
|------|----------|
| Kiracı başına lisans | Her belediye ayrı tenant; veri izolasyonu zorunlu |
| Pilot önce | Tüm yeni müşteriler **90 gün ücretsiz pilot** ile başlar |
| Şeffaf liste fiyatı | Başlangıç ve Profesyonel için yayınlanan aylık fiyat |
| Enterprise özel | Nüfus, MIS entegrasyonu ve SLA’ya göre teklif |
| Yıllık indirim | 12 ay peşin = **10 ay ücreti** (2 ay bedava) |
| Gizli maliyet yok | Temel kurulum, tenant açılışı ve standart eğitim Profesyonel+ içinde |

---

## 2. Planlar ve liste fiyatları

| Plan | Kim için | Aylık (KDV hariç) | Yıllık peşin |
|------|----------|-------------------|--------------|
| **Başlangıç** | Küçük ilçe / düşük hacim (< ~50 bin nüfus) | **₺4.990** | **₺49.900** |
| **Profesyonel** | Çoğu belediye (önerilen) | **₺9.999** | **₺99.990** |
| **Enterprise** | Büyük ilçe / il / MIS ihtiyacı | **Teklif** (liste başlangıç **₺24.990**/ay) | Özel |

> Public sitede vurgulanan “önerilen” rakam **Profesyonel ₺9.999/ay**’dır. Üç plan da her zaman gösterilir.

### 2.1 Dahil olanlar (özet)

**Başlangıç:** İhbar yönetimi, Beyaz Masa, en fazla 3 departman, Excel/PDF export, temel roller, vatandaş mobil erişimi.

**Profesyonel (+):** Sınırsız departman, canlı harita/ısı, AI önceliklendirme, KVKK yüz/plaka maskeleme, anket/duyuru, pazarlama kiti (QR/afiş), başkan özeti, standart kurulum eğitimi.

**Enterprise (+):** MIS (Sampaş/Kolaylı/Netigma vb.), webhook/API anahtarı, özel SLA, sosyal ilanlar, öncelikli destek, yerinde/uzaktan özel eğitim.

Tam özellik matrisi: admin portal `PricingPage` / bu paketteki one-pager.

---

## 3. Pilot (90 gün)

1. Tenant açılır, branding ve departmanlar kurulur.
2. En az 1 yönetici + 1 saha / Beyaz Masa kullanıcısı eğitilir.
3. Vatandaş kanalı (mobil / web) yayınlanır veya kısıtlı pilot grubu.
4. Başarı ölçütleri: `deployment/PILOT-BASARI-KRITERLERI.md`.
5. Pilot sonunda: Profesyonel’e geçiş önerisi veya Enterprise teklifi.

Pilot ücretlendirilmez. Pilot sonrası abonelik başlamadan fatura kesilmez.

---

## 4. Opsiyonel kalemler (Enterprise / özel)

| Kalem | Not |
|-------|-----|
| Ek MIS adaptörü | Tek seferlik entegrasyon ücreti (teklifte) |
| Ek dil / özel white-label domain | Teklif |
| Yerinde eğitim (gün) | Teklif |
| SLA 7/24 | Enterprise ek paket |

---

## 5. İndirim kuralları (satış disiplini)

- Liste fiyatının **%15’inden fazla** indirim için kurucu/satış onayı.
- Belediye birlikleri / çoklu tenant: hacim indirimi teklifte hesaplanır.
- Kamu ihalesi: bu liste “referans birim fiyat”; ihale şartnamesine göre uyarlanır.

---

## 6. Fatura ve sözleşme

- Aylık veya yıllık fatura (e-fatura).
- Sözleşme: pilot protokolü → ücretli abonelik eki.
- KVKK veri işleme eki zorunlu: `deployment/KVKK-VERI-ISLEME-EKI.md`.

---

## 7. Rakip konumlandırma (tek cümle)

WhatsApp / e-posta / Excel kuyruklarına göre Kentiva; **atama, SLA, vatandaş takibi, KVKK ve denetim izini** tek üründe birleştirir. Legacy MIS’e rakip değil; Enterprise ile **MIS’e bağlanır**.
