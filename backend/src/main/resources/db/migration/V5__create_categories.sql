-- ============================================================
-- Rapor kategorileri
-- ============================================================
CREATE TABLE report_categories (
    id            VARCHAR(36)  PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    description   VARCHAR(255),
    icon_code     VARCHAR(50),
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    department_id VARCHAR(36)  REFERENCES departments(id) ON DELETE SET NULL,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP
);

-- Seed: Başlangıç kategorileri — departman FK'ları sonraki adımda güncellenir
INSERT INTO report_categories (id, name, description, icon_code, active, created_at, updated_at) VALUES
    (gen_random_uuid()::varchar, 'Yol Çukuru',        'Yolda oluşan tehlikeli çukurlar',      'road_crack',   TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Kaldırım Hasarı',   'Kırık/bozuk kaldırım taşları',         'sidewalk',     TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Çöp/Atık',          'Çöp birikimi ve usulsüz atık dökme',   'trash',        TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Park İhlali',        'Park ve bahçe alanlarındaki ihlaller', 'park',         TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Sokak Lambası Arızası','Yanmayan veya arızalı aydınlatma',  'streetlight',  TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'İşgal/Engel',       'Yaya yolunu kapatan engeller/işgal',   'block',        TRUE, NOW(), NOW()),
    (gen_random_uuid()::varchar, 'Diğer',             'Yukarıdakilere girmeyen diğer sorunlar','other',        TRUE, NOW(), NOW());
