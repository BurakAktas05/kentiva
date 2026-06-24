-- ============================================================
-- V39: Super admin rolünü ve kullanıcıyı hazırla.
-- ŞİFRE: Flyway migration'dan değil, /api/v1/setup endpoint'i
-- veya APP_SETUP_TOKEN ile güvenli şekilde oluşturulmalıdır.
-- Bu migration sadece roller ve admin kullanıcı iskeletini sağlar.
-- ============================================================

-- Eğer admin kullanıcısı yoksa, devre dışı olarak oluştur
-- (şifre sıfırlanmadan giriş yapılamaz)
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, created_at, updated_at)
SELECT
    gen_random_uuid()::text,
    'admin@kentiva.app',
    -- Rastgele geçersiz hash — /api/v1/setup ile şifre belirlenmeli
    '$2b$10$PLACEHOLDER_HASH_DO_NOT_USE_SETUP_ENDPOINT_REQUIRED',
    'Super',
    'Admin',
    '00000000000',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM app_users WHERE email = 'admin@kentiva.app'
);

-- SUPER_ADMIN rolünü garantile
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app_users u
CROSS JOIN roles r
WHERE u.email = 'admin@kentiva.app'
  AND r.name  = 'ROLE_SUPER_ADMIN'
ON CONFLICT DO NOTHING;
