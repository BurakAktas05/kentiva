-- Safranbolu Test Verileri (yalnızca dev profili için)
INSERT INTO municipalities (
    id, name, type, center_lat, center_lng, default_zoom, boundaries,
    slug, display_name, active, onboarded, public_stats_enabled,
    created_at, updated_at
)
VALUES (
    'uuid-safranbolu-belediyesi',
    'Safranbolu Belediyesi',
    'DISTRICT',
    41.25,
    32.68,
    13,
    ST_Buffer(ST_SetSRID(ST_MakePoint(32.68, 41.25), 4326)::geography, 10000)::geometry,
    'safranbolu',
    'Safranbolu Belediyesi',
    true,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    boundaries = EXCLUDED.boundaries,
    center_lat = EXCLUDED.center_lat,
    center_lng = EXCLUDED.center_lng,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO departments (id, name, description, active, created_at, updated_at, municipality_id, slug)
VALUES (
    'dept-safranbolu-fen',
    'Fen İşleri',
    'Safranbolu Fen İşleri Müdürlüğü',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'uuid-safranbolu-belediyesi',
    'fen-isleri'
) ON CONFLICT (id) DO NOTHING;

-- Dev şifresi: password
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, district, municipality_id, created_at, updated_at)
VALUES (
    'user-safranbolu-admin',
    'admin@safranbolu.bel.tr',
    '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS',
    'Safranbolu',
    'Admin',
    '5551112233',
    true,
    'Safranbolu Belediyesi',
    'uuid-safranbolu-belediyesi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-safranbolu-admin', r.id FROM roles r WHERE r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, department_id, district, municipality_id, created_at, updated_at)
VALUES (
    'user-safranbolu-saha',
    'saha@safranbolu.bel.tr',
    '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS',
    'Ahmet',
    'Saha',
    '5554445566',
    true,
    'dept-safranbolu-fen',
    'Safranbolu Belediyesi',
    'uuid-safranbolu-belediyesi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-safranbolu-saha', r.id FROM roles r WHERE r.name = 'ROLE_FIELD_OFFICER'
ON CONFLICT DO NOTHING;

INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, created_at, updated_at)
VALUES (
    'user-vatandas',
    'vatandas@test.com',
    '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS',
    'Ayşe',
    'Vatandaş',
    '5559998877',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-vatandas', r.id FROM roles r WHERE r.name = 'ROLE_CITIZEN'
ON CONFLICT DO NOTHING;
