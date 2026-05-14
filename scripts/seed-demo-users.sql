-- Demo giriş hesapları (yerel test). Bir kez çalıştırın: psql veya pgAdmin.
-- citizen@test.local şifresi: password123 (V24 safranbolu@test.local ile aynı bcrypt)
-- field@test.local: ayrı hash; şifre bilinmiyorsa personel@ibb.gov.tr / admin123 kullanın.

INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, department_id, created_at, updated_at) VALUES
    ('uuid-test-citizen', 'citizen@test.local',
     '$2b$10$iaRzpEdcVDPFh7Whh16D2ezjxTqWbhd9yfRWHptkEEsC7BIRm3ztq',
     'Demo', 'Vatandas', '05001112233', true, null, NOW(), NOW()),
    ('uuid-test-field', 'field@test.local',
     '$2b$10$.ICQe2jjKM95YGNXAAYwFOFv1H2ASePZX6EiCOkuSJfj0sYf2F8pe',
     'Demo', 'Saha', '05004445566', true, 'uuid-dept-yol', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES
    ('uuid-test-citizen', 'uuid-role-citizen'),
    ('uuid-test-field', 'uuid-role-field')
ON CONFLICT DO NOTHING;
