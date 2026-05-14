-- Test saha gorevlisi (sifre: admin123)
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, department_id, district, created_at, updated_at)
VALUES ('uuid-field-user', 'personel@ibb.gov.tr', '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS', 'Ahmet', 'Yilmaz', '05551234567', true, 'uuid-dept-yol', 'Kadikoy', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES ('uuid-field-user', 'uuid-role-field') ON CONFLICT DO NOTHING;

-- Test birim muduru (sifre: admin123)
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, department_id, district, created_at, updated_at)
VALUES ('uuid-manager-user', 'mudur@ibb.gov.tr', '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS', 'Mehmet', 'Kaya', '05559876543', true, 'uuid-dept-yol', 'Kadikoy', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) VALUES ('uuid-manager-user', 'uuid-role-dept') ON CONFLICT DO NOTHING;
