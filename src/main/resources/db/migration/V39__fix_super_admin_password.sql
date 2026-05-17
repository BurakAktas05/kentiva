-- ============================================================
-- V39: Super admin sifresini (admin123) dogru BCrypt hash ile yaz.
-- Hash: $2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2
-- Bu migration idempotent calisir.
-- ============================================================

-- Eger kullanici e-posta ile varsa hash'i guncelle
UPDATE app_users
SET password   = '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    enabled    = true,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@kentiva.app';

-- Eger yoksa (production fresh install) olustur
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, created_at, updated_at)
SELECT
    gen_random_uuid()::text,
    'admin@kentiva.app',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Super',
    'Admin',
    '05555555555',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM app_users WHERE email = 'admin@kentiva.app'
);

-- SUPER_ADMIN rolunu garantile (eger yoksa ekle)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app_users u
CROSS JOIN roles r
WHERE u.email = 'admin@kentiva.app'
  AND r.name  = 'ROLE_SUPER_ADMIN'
ON CONFLICT DO NOTHING;
