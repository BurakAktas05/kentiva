# Object storage (S3 uyumlu medya)

Kentiva medyayı S3 API ile saklar (`APP_STORAGE_TYPE=s3`). Sağlayıcı serbest.

```env
APP_STORAGE_TYPE=s3
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET_NAME=
S3_REGION=auto
S3_PUBLIC_URL=
```

`S3_PUBLIC_URL` genelde boş kalır — dosyalar imzalı URL ile (`/api/v1/media/access?...`) sunulur.
Bucket’ı **public** yapmayın.

Prod’da `APP_STORAGE_TYPE=local` kullanmayın (ephemeral disk).

---

## Seçenek A — Cloudflare R2

1. R2 → Create bucket (örn. `kentiva-media-prod`)
2. API Token (Object Read & Write)
3. Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
4. Access Key / Secret → `S3_ACCESS_KEY` / `S3_SECRET_KEY`
5. `S3_REGION=auto`

## Seçenek B — AWS S3

1. Bucket oluştur (örn. `eu-central-1`)
2. IAM kullanıcı: `s3:PutObject`, `GetObject`, `DeleteObject` (bucket scope)
3. `S3_ENDPOINT=` boş bırakılabilir (AWS SDK default) veya bölgesel endpoint
4. `S3_REGION=eu-central-1` (bölgeniz)
5. Access key / secret

## Seçenek C — Backblaze B2 / DigitalOcean Spaces / MinIO

S3 uyumlu endpoint + key/secret/bucket. Dokümantasyondaki “S3 compatible”
endpoint’i `S3_ENDPOINT` olarak verin.

---

## Doğrulama

```bash
curl https://api.example.com/actuator/health
```

`s3` bileşeni `UP` olmalı. İhbar fotoğrafı yükleyip önizleme açılmalı.
