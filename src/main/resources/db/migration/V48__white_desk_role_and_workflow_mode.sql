-- 1. Yeni ROLE_WHITE_DESK rolü
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES (gen_random_uuid()::varchar, 'ROLE_WHITE_DESK',
        'Beyaz Masa — gelen ihbarları inceler, departmana yönlendirir veya direkt atar',
        NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. Municipality'ye workflow_mode alanı (SIMPLE | DEPARTMENTAL)
ALTER TABLE municipalities
  ADD COLUMN IF NOT EXISTS workflow_mode VARCHAR(20) NOT NULL DEFAULT 'SIMPLE';

-- 3. Reports tablosuna yönlendirme alanları
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS forwarded_department_id VARCHAR(36) REFERENCES departments(id),
  ADD COLUMN IF NOT EXISTS forwarded_at            TIMESTAMP,
  ADD COLUMN IF NOT EXISTS forwarded_by_id         VARCHAR(36) REFERENCES app_users(id);

-- 4. Performans indeksleri
CREATE INDEX IF NOT EXISTS idx_reports_forwarded_dept
    ON reports(forwarded_department_id) WHERE forwarded_department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_status_dept
    ON reports(report_status, forwarded_department_id);
