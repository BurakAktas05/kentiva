-- ============================================================
-- Safranbolu Belediyesi Demo Verisi (yalnızca dev profili)
-- ============================================================

-- 2. Safranbolu Belediyesi için Müşteri (Vatandaş) Hesabı Ekle
-- Şifre: password123 (bcrypt hash'i: $2b$10$iaRzpEdcVDPFh7Whh16D2ezjxTqWbhd9yfRWHptkEEsC7BIRm3ztq)
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, municipality_id, created_at, updated_at) 
VALUES (
    'safranbolu-citizen-id', 
    'safranbolu@test.local', 
    '$2b$10$iaRzpEdcVDPFh7Whh16D2ezjxTqWbhd9yfRWHptkEEsC7BIRm3ztq', 
    'Müşteri', 
    'Safranbolu', 
    '05559998877', 
    true, 
    'uuid-safranbolu-belediyesi', 
    NOW(), 
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 3. Müşteriye Vatandaş Rolü Ata
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app_users u
CROSS JOIN roles r
WHERE u.email = 'safranbolu@test.local' AND r.name = 'ROLE_CITIZEN'
ON CONFLICT DO NOTHING;

-- 4. Safranbolu admin (şifre: admin123)
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, municipality_id, created_at, updated_at) 
VALUES (
    'safranbolu-admin-id', 
    'admin@safranbolu.bel.tr', 
    '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS', 
    'Admin', 
    'Safranbolu', 
    '05559998800', 
    true, 
    'uuid-safranbolu-belediyesi', 
    NOW(), 
    NOW()
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM app_users u
CROSS JOIN roles r
WHERE u.email = 'admin@safranbolu.bel.tr' AND r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;
