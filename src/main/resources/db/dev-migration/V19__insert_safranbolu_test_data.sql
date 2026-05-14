-- Safranbolu Test Verileri (yalnızca dev profili için)
INSERT INTO municipalities (id, name, type, center_lat, center_lng, default_zoom, boundaries, created_at, updated_at)
VALUES (
    'safranbolu-id-123',
    'Safranbolu Belediyesi',
    'DISTRICT',
    41.25,
    32.68,
    13,
    ST_Buffer(ST_SetSRID(ST_MakePoint(32.68, 41.25), 4326)::geography, 10000)::geometry,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, name, description, active, created_at, updated_at, municipality_id)
VALUES (
    'dept-safranbolu-fen',
    'Fen İşleri',
    'Safranbolu Fen İşleri Müdürlüğü',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'safranbolu-id-123'
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
    'safranbolu-id-123',
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
    'safranbolu-id-123',
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
