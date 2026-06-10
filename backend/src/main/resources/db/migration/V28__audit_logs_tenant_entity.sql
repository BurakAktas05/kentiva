-- Denetim günlüğü: belediye kapsamı ve ilişkili varlık (rapor vb.)
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS municipality_id VARCHAR(36),
    ADD COLUMN IF NOT EXISTS entity_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_audit_municipality ON audit_logs (municipality_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_id);
