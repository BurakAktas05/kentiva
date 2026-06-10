-- ============================================================
-- Rapor medya dosyaları (fotoğraf/video URL'leri)
-- ============================================================
CREATE TABLE report_media (
    id         VARCHAR(36)   PRIMARY KEY,
    image_url  VARCHAR(1000) NOT NULL,
    public_id  VARCHAR(500),           -- Cloudflare R2 / S3 silme anahtarı
    report_id  VARCHAR(36)   NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    created_at TIMESTAMP     NOT NULL,
    updated_at TIMESTAMP
);

CREATE INDEX idx_report_media_report ON report_media(report_id);
