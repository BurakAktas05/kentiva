-- Kentiva V2: belediye markalama / SaaS bayrakları + rapor AI alanları

ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS slug VARCHAR(120);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS display_name VARCHAR(150);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS logo_url VARCHAR(512);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS slogan VARCHAR(255);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS website_url VARCHAR(512);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS public_stats_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE municipalities SET display_name = name WHERE display_name IS NULL;

UPDATE municipalities SET slug = 'm-' || REPLACE(id::text, '-', '')
WHERE slug IS NULL OR TRIM(BOTH FROM slug) = '';

ALTER TABLE municipalities ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_municipalities_slug ON municipalities (slug);
CREATE INDEX IF NOT EXISTS idx_municipalities_active_type ON municipalities (active, type);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_sla_risk VARCHAR(20);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_reply_draft TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_duplicate_hint VARCHAR(500);
