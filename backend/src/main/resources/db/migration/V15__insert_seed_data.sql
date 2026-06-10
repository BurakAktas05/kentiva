-- ============================================================
-- V15: Sistem rolleri (production-safe)
-- Örnek departmanlar ve dev süper admin: db/dev-migration/V25__...
-- ============================================================

INSERT INTO roles (id, name, description, created_at, updated_at) VALUES
    ('uuid-role-citizen', 'ROLE_CITIZEN', 'Standart Vatandaş', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-role-field', 'ROLE_FIELD_OFFICER', 'Saha Görevlisi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-role-dept', 'ROLE_DEPT_MANAGER', 'Birim Müdürü', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-role-admin', 'ROLE_ADMIN', 'Sistem Yöneticisi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-role-super', 'ROLE_SUPER_ADMIN', 'Süper Yönetici', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

