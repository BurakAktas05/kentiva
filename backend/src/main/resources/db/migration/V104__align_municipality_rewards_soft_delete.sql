-- Align the production Flyway schema with MunicipalityReward's soft-delete mapping.
-- V64 predates the municipality_rewards table (created by V71), so it could not
-- add this column on a clean database. Local ddl-auto=update previously masked it.
ALTER TABLE municipality_rewards
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_rewards_municipality_active
    ON municipality_rewards (municipality_id, active)
    WHERE deleted = FALSE;
