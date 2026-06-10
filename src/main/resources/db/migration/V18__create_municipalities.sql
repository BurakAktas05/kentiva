-- 1. Create municipalities table
CREATE TABLE IF NOT EXISTS municipalities (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    parent_id VARCHAR(255) REFERENCES municipalities(id),
    center_lat DOUBLE PRECISION NOT NULL DEFAULT 41.0082,
    center_lng DOUBLE PRECISION NOT NULL DEFAULT 28.9784,
    default_zoom INTEGER NOT NULL DEFAULT 12,
    boundaries geometry(Polygon, 4326)
);

-- 4. Add municipality_id to other tables
ALTER TABLE app_users ADD COLUMN municipality_id VARCHAR(255) REFERENCES municipalities(id);
ALTER TABLE departments ADD COLUMN municipality_id VARCHAR(255) REFERENCES municipalities(id);
ALTER TABLE reports ADD COLUMN municipality_id VARCHAR(255) REFERENCES municipalities(id);
