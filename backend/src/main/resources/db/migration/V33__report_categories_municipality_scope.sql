-- Kategoriler: global (municipality_id NULL) veya belediye özel

ALTER TABLE report_categories
    ADD COLUMN IF NOT EXISTS municipality_id VARCHAR(36) REFERENCES municipalities(id) ON DELETE CASCADE;

UPDATE report_categories rc
SET municipality_id = d.municipality_id
FROM departments d
WHERE rc.department_id = d.id
  AND rc.municipality_id IS NULL
  AND d.municipality_id IS NOT NULL;

ALTER TABLE report_categories DROP CONSTRAINT IF EXISTS report_categories_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_categories_global_name
    ON report_categories (name)
    WHERE municipality_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_categories_municipality_name
    ON report_categories (municipality_id, name)
    WHERE municipality_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_categories_municipality_active
    ON report_categories (municipality_id, active);
