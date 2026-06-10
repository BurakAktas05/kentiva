-- Safranbolu Özel ve Özelleştirilmiş Tohum Verileri (Dev ve Test için)

-- 1. Safranbolu Belediyesi Ekleme (Saffron/Amber temalı, entegrasyonlar ve widget'lar aktif)
INSERT INTO municipalities (
    id, 
    name, 
    type, 
    center_lat, 
    center_lng, 
    default_zoom, 
    boundaries,
    slug, 
    display_name, 
    active, 
    onboarded, 
    public_stats_enabled,
    primary_color,
    secondary_color,
    accent_color,
    slogan,
    workflow_mode,
    sms_sender_header,
    subscription_plan,
    subscription_ends_at,
    widget_city_slug,
    widget_district_slug,
    created_at, 
    updated_at
)
VALUES (
    'uuid-safranbolu-belediyesi',
    'Safranbolu Belediyesi',
    'DISTRICT',
    41.2507,
    32.6942,
    13,
    ST_Buffer(ST_SetSRID(ST_MakePoint(32.6942, 41.2507), 4326)::geography, 15000)::geometry,
    'safranbolu',
    'Safranbolu',
    true,
    true,
    true,
    '#d97706', -- Birincil: Safran Sarısı (Amber)
    '#9a3412', -- İkincil: Safran Kızılı/Kiremit (Rust/Orange)
    '#10b981', -- Vurgu: Zümrüt Yeşili (Emerald)
    'Korumacılığın Başkenti',
    'DEPARTMENTAL', -- Departmanlı Mod
    'SAFRANBOLU',
    'ENTERPRISE',
    '2030-12-31 23:59:59',
    'karabuk',
    'safranbolu',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    boundaries = EXCLUDED.boundaries,
    center_lat = EXCLUDED.center_lat,
    center_lng = EXCLUDED.center_lng,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    accent_color = EXCLUDED.accent_color,
    slogan = EXCLUDED.slogan,
    workflow_mode = EXCLUDED.workflow_mode,
    widget_city_slug = EXCLUDED.widget_city_slug,
    widget_district_slug = EXCLUDED.widget_district_slug,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Safranbolu Belediyesi Departmanları
INSERT INTO departments (id, name, description, active, created_at, updated_at, municipality_id, slug)
VALUES 
    ('dept-safranbolu-fen', 'Fen İşleri Müdürlüğü', 'Yol, asfalt ve kaldırım onarım işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'uuid-safranbolu-belediyesi', 'fen-isleri'),
    ('dept-safranbolu-cevre', 'Temizlik ve Çevre İşleri', 'Çöp toplama ve çevre temizlik işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'uuid-safranbolu-belediyesi', 'cevre-koruma-ve-temizlik'),
    ('dept-safranbolu-ulasim', 'Ulaşım Hizmetleri', 'Toplu taşıma ve durak düzenlemeleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'uuid-safranbolu-belediyesi', 'ulasim-hizmetleri'),
    ('dept-safranbolu-zabita', 'Zabıta Müdürlüğü', 'Denetim, işgal ve zabıta kontrol işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'uuid-safranbolu-belediyesi', 'zabita-mudurlugu')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    slug = EXCLUDED.slug,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Safranbolu Belediyesi Erişim Yetkilileri ve Test Kullanıcıları
-- Şifre: admin123 (Bcrypt Hash: $2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2)

-- A. Safranbolu Admin Kullanıcısı
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, district, municipality_id, created_at, updated_at)
VALUES (
    'user-safranbolu-admin',
    'admin@safranbolu.bel.tr',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Safranbolu',
    'Admin',
    '05551112233',
    true,
    'Safranbolu',
    'uuid-safranbolu-belediyesi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    enabled = true,
    municipality_id = EXCLUDED.municipality_id,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-safranbolu-admin', r.id FROM roles r WHERE r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;

-- B. Safranbolu Saha Görevlisi (Fen İşleri)
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, department_id, district, municipality_id, created_at, updated_at)
VALUES (
    'user-safranbolu-saha',
    'saha@safranbolu.bel.tr',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Ahmet',
    'Saha',
    '05554445566',
    true,
    'dept-safranbolu-fen',
    'Safranbolu',
    'uuid-safranbolu-belediyesi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    enabled = true,
    department_id = EXCLUDED.department_id,
    municipality_id = EXCLUDED.municipality_id,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-safranbolu-saha', r.id FROM roles r WHERE r.name = 'ROLE_FIELD_OFFICER'
ON CONFLICT DO NOTHING;

-- C. Test Vatandaş Kullanıcısı
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, created_at, updated_at)
VALUES (
    'user-vatandas',
    'vatandas@test.com',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Ayşe',
    'Vatandaş',
    '05559998877',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    enabled = true,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-vatandas', r.id FROM roles r WHERE r.name = 'ROLE_CITIZEN'
ON CONFLICT DO NOTHING;
