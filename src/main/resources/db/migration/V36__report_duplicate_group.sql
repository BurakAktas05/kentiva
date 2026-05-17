-- Aynı konumdan gelen aktif ihbarları tek olay olarak gruplamak için
ALTER TABLE reports ADD COLUMN IF NOT EXISTS duplicate_group_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_reports_duplicate_group_id ON reports (duplicate_group_id)
    WHERE duplicate_group_id IS NOT NULL;
