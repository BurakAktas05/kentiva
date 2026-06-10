-- ERP/CRM entegrasyonu: API anahtarları ve giden webhook
CREATE TABLE municipality_api_keys (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    municipality_id VARCHAR(255) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    key_prefix      VARCHAR(16) NOT NULL,
    key_hash        VARCHAR(64) NOT NULL,
    scopes          VARCHAR(255) NOT NULL DEFAULT 'reports:read',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_municipality_api_keys_municipality ON municipality_api_keys(municipality_id);
CREATE UNIQUE INDEX idx_municipality_api_keys_prefix ON municipality_api_keys(key_prefix) WHERE active = TRUE;

ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(512),
    ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(64);
