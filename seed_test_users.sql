-- Test kullanicilari ekle (tum roller icin)
-- Hash: $2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2  = "Test1234!"
-- Safranbolu Belediyesi ID: uuid-safranbolu-belediyesi

-- 1. Safranbolu Belediye Admini
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, municipality_id, enabled, created_at, updated_at)
VALUES (
    gen_random_uuid()::text,
    'admin@safranbolu.bel.tr',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Ahmet',
    'Yilmaz',
    '05321110001',
    'uuid-safranbolu-belediyesi',
    true,
    NOW(), NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    enabled  = true;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, '7f698507-1ee5-4d70-9d31-9ccf59b183b9'
FROM app_users u WHERE u.email = 'admin@safranbolu.bel.tr'
ON CONFLICT DO NOTHING;

-- 2. Safranbolu Vatandas
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, municipality_id, enabled, created_at, updated_at)
VALUES (
    gen_random_uuid()::text,
    'vatandas@test.com',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Fatma',
    'Sahin',
    '05421110002',
    NULL,
    true,
    NOW(), NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    enabled  = true;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, '069dab9a-7440-4355-a3ad-73b2325bb8f7'
FROM app_users u WHERE u.email = 'vatandas@test.com'
ON CONFLICT DO NOTHING;

-- 3. Saha Gorevlisi
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, municipality_id, enabled, created_at, updated_at)
VALUES (
    gen_random_uuid()::text,
    'saha@safranbolu.bel.tr',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Murat',
    'Demir',
    '05551110003',
    'uuid-safranbolu-belediyesi',
    true,
    NOW(), NOW()
) ON CONFLICT (email) DO UPDATE SET
    password = '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    enabled  = true;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, '821b605d-380b-4865-b169-0c2084ba5ec1'
FROM app_users u WHERE u.email = 'saha@safranbolu.bel.tr'
ON CONFLICT DO NOTHING;

-- Kontrol
SELECT u.email, r.name as rol, u.enabled
FROM app_users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email IN ('admin@kentiva.app','admin@safranbolu.bel.tr','vatandas@test.com','saha@safranbolu.bel.tr')
ORDER BY u.email;
