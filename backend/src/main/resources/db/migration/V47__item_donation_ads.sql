-- V47: Vatandaş eşya bağış ilanları (C2C)
CREATE TABLE IF NOT EXISTS item_donation_ads (
    id          VARCHAR(36) PRIMARY KEY,
    user_id     VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    item_title  VARCHAR(150) NOT NULL,
    category    VARCHAR(50) NOT NULL,
    district    VARCHAR(100) NOT NULL,
    item_condition VARCHAR(30) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    description TEXT,
    media_url   VARCHAR(500),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_donation_district ON item_donation_ads(district);
