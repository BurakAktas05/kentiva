-- ============================================================
-- V15: Seed Data (Sistem Başlangıç Verileri)
-- Rollerin, izinlerin, varsayılan adminin ve kategorilerin 
-- veritabanı kurulduğunda otomatik oluşturulmasını sağlar.
-- ============================================================

-- 1. Roller
INSERT INTO roles (id, name, description, created_at, updated_at) VALUES
    ('uuid-role-citizen', 'ROLE_CITIZEN', 'Standart Vatandaş', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-role-field', 'ROLE_FIELD_OFFICER', 'Saha Görevlisi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-role-dept', 'ROLE_DEPT_MANAGER', 'Birim Müdürü', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-role-admin', 'ROLE_ADMIN', 'Sistem Yöneticisi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-role-super', 'ROLE_SUPER_ADMIN', 'Süper Yönetici', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- 2. Departmanlar (Örnek)
INSERT INTO departments (id, name, description, active, created_at, updated_at) VALUES
    ('uuid-dept-yol', 'Yol Bakım ve Onarım', 'Yollarla ilgili sorunlar', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-dept-cevre', 'Çevre Koruma', 'Çevre ve temizlik işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-dept-su', 'Su ve Kanalizasyon (İSKİ)', 'Su patlağı, kanalizasyon', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('uuid-dept-ulasim', 'Ulaşım Hizmetleri', 'Toplu taşıma ve duraklar', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- 3. Süper Admin Kullanıcısı
-- Şifre "admin123" olarak bcrypt ile şifrelenmiştir. İlk girişte değiştirilmesi gerekir.
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, created_at, updated_at) VALUES
    ('uuid-admin-user', 'admin@ibb.gov.tr', '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS', 'Super', 'Admin', '05555555555', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Admibe Süper Admin rolünü atama
INSERT INTO user_roles (user_id, role_id)
SELECT 'uuid-admin-user', r.id FROM roles r WHERE r.name = 'ROLE_SUPER_ADMIN'
ON CONFLICT DO NOTHING;


