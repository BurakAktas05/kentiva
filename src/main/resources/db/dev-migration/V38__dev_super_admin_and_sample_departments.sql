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
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'uuid-admin-user', r.id FROM roles r WHERE r.name = 'ROLE_SUPER_ADMIN'
ON CONFLICT DO NOTHING;
