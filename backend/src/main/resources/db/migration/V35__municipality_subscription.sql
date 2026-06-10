-- Belediye SaaS üyelik / abonelik alanları
ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(32) NOT NULL DEFAULT 'TRIAL',
    ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP;

-- Mevcut kayıtlar: oluşturulma + 30 gün deneme
UPDATE municipalities
SET subscription_ends_at = created_at + INTERVAL '30 days'
WHERE subscription_ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_municipalities_subscription_ends
    ON municipalities (subscription_ends_at);
