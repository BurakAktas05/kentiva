# Media Guard — üretim dağıtımı

Media Guard, ihbar görsellerinde yüz yoğunluğu kontrolü yapan hafif FastAPI servisidir.  
Üretim profili (`prod`) `MEDIA_GUARD_URL` olmadan **başlamayı reddeder**.

Kaynak: [`../services/media-guard/`](../services/media-guard/)

## Ne yapar / ne yapmaz

| Yapar | Yapmaz |
|-------|--------|
| Haar cascade ile yüz kaplama oranı tahmini | Tam KVKK anonimleştirme (bu backend + Gemini tarafında) |
| Aşırı yüz yoğunluğunda reddetme | Kimlik doğrulama (ağ seviyesinde kısıtlanmalıdır) |
| `/health` ve `/scan` | Genel internete açık CDN gibi hizmet |

## Zorunlu güvenlik

1. **İç ağ / private URL** — public internetten `/scan` açılmamalı.
2. Backend `MEDIA_GUARD_URL` yalnızca bu private adresi göstermeli.
3. Üretimde:

```env
MEDIA_GUARD_URL=http://media-guard.internal:8000
MEDIA_GUARD_FAIL_OPEN=false
MEDIA_VALIDATION_FAIL_OPEN=false
MEDIA_ANONYMIZATION_FAIL_OPEN=false
```

## Railway (önerilen)

1. Aynı Railway projesinde yeni servis oluşturun.
2. Root / Dockerfile: `services/media-guard/Dockerfile`
3. Port: `8000`
4. Backend değişkeni:

```env
MEDIA_GUARD_URL=http://<media-guard-private-host>:8000
```

5. Servisi **public domain vermeden** bırakın; yalnızca backend ağı erişsin.
6. Health:

```bash
curl http://<private-host>:8000/health
# {"status":"ok"}
```

## Docker Compose (yalnızca yerel)

`docker compose` zaten `media-guard` servisini ayağa kaldırır:

```env
MEDIA_GUARD_URL=http://media-guard:8000
```

Yerelde host portu (`8001`) debug içindir; production compose kullanmayın.

## Ortam değişkenleri (servis)

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `MAX_FACE_COVERAGE` | `0.22` | Yüz kaplama eşiği (pilot verisiyle kalibre edin) |
| `MAX_IMAGE_BYTES` | `12582912` (12 MB) | İstek gövdesi üst sınırı |

## Backend davranışı

- Zaman aşımı ve sınırlı yeniden deneme: `MediaGuardClient`
- `fail-open=false` iken Media Guard erişilemezse medya yükleme reddedilir (bilinçli)
- Boş / bozuk AI anonimleştirme yanıtı orijinal görseli bırakmaz (fail-closed)

## Smoke test

```bash
# health
curl -sS "$MEDIA_GUARD_URL/health"

# backend readiness (media bağımlılığı dolaylı)
curl -sS "https://<API_HOST>/actuator/health/readiness"
```

İhbar oluşturma akışında küçük bir test görseli yükleyin; yüz yoğunluğu yüksek görseller reddedilmeli, normal saha fotoğrafları geçmeli.

## Sorun giderme

| Belirti | Olası neden |
|---------|-------------|
| Backend boot reddi | `MEDIA_GUARD_URL` boş veya fail-open true |
| Upload sürekli 5xx | Media Guard down / yanlış URL / timeout |
| Healthcheck Compose’da fail | Slim imajda `wget` yok olabilir; prod’da private TCP health kullanın |
| Çok fazla reddetme | `MAX_FACE_COVERAGE` eşiğini pilot verisiyle ayarlayın |
