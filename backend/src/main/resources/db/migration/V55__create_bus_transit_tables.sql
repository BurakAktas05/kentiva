-- V55__create_bus_transit_tables.sql
-- Otobüs hatları, favori hatlar ve favori duraklar tabloları

-- 1. Otobüs Hatları Tablosu
CREATE TABLE IF NOT EXISTS bus_routes (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50) NOT NULL,
    stops_json      TEXT NOT NULL,
    color           VARCHAR(50) NOT NULL,
    icon            VARCHAR(50) NOT NULL,
    schedule_json   TEXT NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    municipality_id VARCHAR(36) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Favori Hatlar Tablosu
CREATE TABLE IF NOT EXISTS starred_routes (
    id         VARCHAR(36) PRIMARY KEY,
    user_id    VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    route_id   VARCHAR(36) NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_starred_routes_user_route UNIQUE (user_id, route_id)
);

-- 3. Favori Duraklar Tablosu
CREATE TABLE IF NOT EXISTS starred_stops (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    stop_name       VARCHAR(255) NOT NULL,
    municipality_id VARCHAR(36) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_starred_stops_user_stop_muni UNIQUE (user_id, stop_name, municipality_id)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_bus_routes_muni ON bus_routes(municipality_id);
CREATE INDEX IF NOT EXISTS idx_starred_routes_user ON starred_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_stops_user ON starred_stops(user_id);
