ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS reputation_score INT NOT NULL DEFAULT 100;

ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS preferred_municipality_id VARCHAR(36);

ALTER TABLE app_users
    ADD CONSTRAINT fk_users_preferred_municipality
        FOREIGN KEY (preferred_municipality_id) REFERENCES municipalities(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS municipality_outages (
    id              VARCHAR(36) PRIMARY KEY,
    municipality_id VARCHAR(36) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    outage_type     VARCHAR(20) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    district        VARCHAR(100),
    message         TEXT,
    starts_at       TIMESTAMP,
    ends_at         TIMESTAMP,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS municipality_events (
    id              VARCHAR(36) PRIMARY KEY,
    municipality_id VARCHAR(36) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    venue           VARCHAR(200),
    description     TEXT,
    starts_at       TIMESTAMP NOT NULL,
    ends_at         TIMESTAMP,
    external_url    VARCHAR(500),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outages_municipality ON municipality_outages(municipality_id);
CREATE INDEX IF NOT EXISTS idx_events_municipality ON municipality_events(municipality_id);
