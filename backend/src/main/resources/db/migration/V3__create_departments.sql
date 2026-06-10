-- ============================================================
-- Belediye birimleri (Departmanlar)
-- ============================================================
CREATE TABLE departments (
    id          VARCHAR(36)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP
);

-- Seed: İBB birimleri
INSERT INTO departments (id, name, description, active, created_at, updated_at) VALUES
    (gen_random_uuid()::varchar, 'Yol Bakım Müdürlüğü',       'Yol, kaldırım, asfalt sorunları',    TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Çevre Koruma Müdürlüğü',    'Çöp, çevre temizliği, atık yönetimi',TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Park ve Bahçeler Müdürlüğü','Park, bahçe, yeşil alan sorunları',   TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Aydınlatma Müdürlüğü',      'Arızalı sokak lambası vb.',           TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Zabıta Müdürlüğü',          'İşgal, ihlal, denetim',              TRUE, NOW(), NOW());
