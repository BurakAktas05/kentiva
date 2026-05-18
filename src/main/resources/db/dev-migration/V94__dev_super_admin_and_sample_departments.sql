-- ============================================================
-- Dev-only: örnek departmanlar + süper admin (admin123)
-- Production Flyway yolunda YOK — yalnızca dev profili.
-- ============================================================

INSERT INTO departments (id, name, description, active, created_at, updated_at) VALUES
    ('uuid-dept-yol', 'Yol Bakım ve Onarım', 'Yollarla ilgili sorunlar', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-dept-cevre', 'Çevre Koruma', 'Çevre ve temizlik işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-dept-su', 'Su ve Kanalizasyon (İSKİ)', 'Su patlağı, kanalizasyon', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-dept-ulasim', 'Ulaşım Hizmetleri', 'Toplu taşıma ve duraklar', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Şifre: admin123 — yalnızca yerel geliştirme
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, created_at, updated_at) VALUES
    ('uuid-admin-user', 'admin@kentiva.app', '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2', 'Super', 'Admin', '05555555555', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    enabled = true,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app_users u
CROSS JOIN roles r
WHERE u.email = 'admin@kentiva.app' AND r.name = 'ROLE_SUPER_ADMIN'
ON CONFLICT DO NOTHING;
