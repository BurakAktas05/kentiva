-- Sık kullanılan bildirim şablonları (kategori + örnek metin)
-- municipality_id NULL → tüm belediyeler için varsayılan; dolu → belediye özelleştirmesi

CREATE TABLE report_templates (
    id                    VARCHAR(36)  PRIMARY KEY,
    municipality_id       VARCHAR(36)  REFERENCES municipalities(id) ON DELETE CASCADE,
    template_key          VARCHAR(50)  NOT NULL,
    title                 VARCHAR(100) NOT NULL,
    description_template  TEXT         NOT NULL,
    category_id           VARCHAR(36)  NOT NULL REFERENCES report_categories(id) ON DELETE RESTRICT,
    icon_code             VARCHAR(50),
    sort_order            INT          NOT NULL DEFAULT 0,
    active                BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP    NOT NULL,
    updated_at            TIMESTAMP
);

CREATE UNIQUE INDEX uq_report_templates_global_key
    ON report_templates (template_key)
    WHERE municipality_id IS NULL;

CREATE UNIQUE INDEX uq_report_templates_municipality_key
    ON report_templates (municipality_id, template_key)
    WHERE municipality_id IS NOT NULL;

CREATE INDEX idx_report_templates_municipality_active
    ON report_templates (municipality_id, active, sort_order);

-- Varsayılan şablonlar (kategori adına göre bağlanır)
INSERT INTO report_templates (id, municipality_id, template_key, title, description_template, category_id, icon_code, sort_order, active, created_at, updated_at)
SELECT gen_random_uuid()::varchar, NULL, 'pothole', 'Yol çukuru',
       'Yolda araç ve yaya trafiğini tehlikeye atan derin bir çukur var. Lütfen en kısa sürede onarım yapılmasını rica ederim.',
       c.id, 'road_crack', 10, TRUE, NOW(), NOW()
FROM report_categories c WHERE c.name = 'Yol Çukuru' LIMIT 1;

INSERT INTO report_templates (id, municipality_id, template_key, title, description_template, category_id, icon_code, sort_order, active, created_at, updated_at)
SELECT gen_random_uuid()::varchar, NULL, 'streetlight', 'Aydınlatma arızası',
       'Sokak lambası yanmıyor / arızalı. Gece güvenliği için tamir edilmesini talep ediyorum.',
       c.id, 'streetlight', 20, TRUE, NOW(), NOW()
FROM report_categories c WHERE c.name = 'Sokak Lambası Arızası' LIMIT 1;

INSERT INTO report_templates (id, municipality_id, template_key, title, description_template, category_id, icon_code, sort_order, active, created_at, updated_at)
SELECT gen_random_uuid()::varchar, NULL, 'trash', 'Çöp / atık',
       'Bölgede usulsüz çöp birikimi var. Temizlik ekibinin müdahale etmesini rica ederim.',
       c.id, 'trash', 30, TRUE, NOW(), NOW()
FROM report_categories c WHERE c.name = 'Çöp/Atık' LIMIT 1;

INSERT INTO report_templates (id, municipality_id, template_key, title, description_template, category_id, icon_code, sort_order, active, created_at, updated_at)
SELECT gen_random_uuid()::varchar, NULL, 'sidewalk', 'Kaldırım hasarı',
       'Kaldırım taşları kırılmış / çökük. Yaya güvenliği için onarım gerekiyor.',
       c.id, 'sidewalk', 40, TRUE, NOW(), NOW()
FROM report_categories c WHERE c.name = 'Kaldırım Hasarı' LIMIT 1;

INSERT INTO report_templates (id, municipality_id, template_key, title, description_template, category_id, icon_code, sort_order, active, created_at, updated_at)
SELECT gen_random_uuid()::varchar, NULL, 'park', 'Park ihlali',
       'Park / yeşil alanda düzensizlik veya ihlal var. Kontrol edilmesini istiyorum.',
       c.id, 'park', 50, TRUE, NOW(), NOW()
FROM report_categories c WHERE c.name = 'Park İhlali' LIMIT 1;

INSERT INTO report_templates (id, municipality_id, template_key, title, description_template, category_id, icon_code, sort_order, active, created_at, updated_at)
SELECT gen_random_uuid()::varchar, NULL, 'obstruction', 'Yol işgali',
       'Yaya yolunu kapatan engel / işgal var. Kaldırılmasını talep ediyorum.',
       c.id, 'block', 60, TRUE, NOW(), NOW()
FROM report_categories c WHERE c.name = 'İşgal/Engel' LIMIT 1;
