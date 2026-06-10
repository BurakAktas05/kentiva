-- ============================================================
-- Roller tablosu
-- ============================================================
CREATE TABLE roles (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(150),
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP
);

-- ============================================================
-- Yetkiler (Permission) tablosu
-- ============================================================
CREATE TABLE permissions (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP
);

-- ============================================================
-- Rol → Yetki ilişki tablosu
-- ============================================================
CREATE TABLE role_permissions (
    role_id       VARCHAR(36) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(36) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- Seed: Sistem rolleri
-- ============================================================
INSERT INTO roles (id, name, description, created_at, updated_at) VALUES
    (gen_random_uuid()::varchar, 'ROLE_CITIZEN',       'Vatandaş — rapor oluşturur',                        NOW(), NOW()),
    (gen_random_uuid()::varchar, 'ROLE_FIELD_OFFICER', 'Saha Ekibi — sahaya gider, raporu kapatır',         NOW(), NOW()),
    (gen_random_uuid()::varchar, 'ROLE_DEPT_MANAGER',  'Birim Müdürü — departman raporlarını yönetir',      NOW(), NOW()),
    (gen_random_uuid()::varchar, 'ROLE_ADMIN',         'Belediye Yöneticisi — tam rapor/kullanıcı erişimi', NOW(), NOW()),
    (gen_random_uuid()::varchar, 'ROLE_SUPER_ADMIN',   'Sistem Yöneticisi — tüm yetki + departman yönetimi',NOW(), NOW());
