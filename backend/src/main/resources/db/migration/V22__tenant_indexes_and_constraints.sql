-- SaaS tenant izolasyonu ve sorgu performansı için üretim migration'ı.
-- Mock/demo veriler dev profile taşındığı için bu dosya yalnızca güvenli şema iyileştirmeleri içerir.

UPDATE reports
SET report_status = 'PROCESSING'
WHERE report_status = 'IN_PROGRESS';

ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_status;
ALTER TABLE reports
    ADD CONSTRAINT chk_reports_status
    CHECK (report_status IN ('PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'));

ALTER TABLE municipalities DROP CONSTRAINT IF EXISTS chk_municipalities_type;
ALTER TABLE municipalities
    ADD CONSTRAINT chk_municipalities_type
    CHECK (type IN ('METROPOLITAN', 'DISTRICT'));

CREATE INDEX IF NOT EXISTS idx_reports_municipality_status_created
    ON reports(municipality_id, report_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_municipality_created
    ON reports(municipality_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_users_municipality
    ON app_users(municipality_id);

CREATE INDEX IF NOT EXISTS idx_departments_municipality_active
    ON departments(municipality_id, active);

CREATE INDEX IF NOT EXISTS idx_report_history_report_created
    ON report_history(report_id, created_at);

CREATE INDEX IF NOT EXISTS idx_municipalities_parent
    ON municipalities(parent_id);

CREATE INDEX IF NOT EXISTS idx_municipalities_boundaries
    ON municipalities USING GIST(boundaries);
