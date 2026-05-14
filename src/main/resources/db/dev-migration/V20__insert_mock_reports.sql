-- V20: Mock Reports (yalnızca dev profili için)
INSERT INTO reports (id, title, description, location, report_status, category_id, reporter_id, district, municipality_id, ai_priority, ai_summary, created_at, updated_at)
VALUES
(
    'mock-rep-1', 'Yol Çukuru - Eski Çarşı', 'Tarihi çarşı girişinde derin bir çukur oluşmuş, turistler zorlanıyor.',
    ST_SetSRID(ST_MakePoint(32.681, 41.251), 4326), 'PENDING',
    (SELECT id FROM report_categories WHERE name = 'Yol Çukuru' LIMIT 1), 'user-vatandas', 'Safranbolu', 'safranbolu-id-123',
    'HIGH', 'Çarşı girişinde ulaşımı engelleyen derin çukur.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
),
(
    'mock-rep-2', 'Sokak Lambası Arızası', 'Bağlar mahallesinde 3 saattir lambalar yanmıyor, hava karardı.',
    ST_SetSRID(ST_MakePoint(32.685, 41.255), 4326), 'PROCESSING',
    (SELECT id FROM report_categories WHERE name = 'Sokak Lambası Arızası' LIMIT 1), 'user-vatandas', 'Safranbolu', 'safranbolu-id-123',
    'MEDIUM', 'Mahalle genelinde aydınlatma sorunu.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 hours'
),
(
    'mock-rep-3', 'Çöp Birikintisi', 'Park alanında hafta sonundan kalan çöpler toplanmamış.',
    ST_SetSRID(ST_MakePoint(32.683, 41.253), 4326), 'RESOLVED',
    (SELECT id FROM report_categories WHERE name = 'Çöp/Atık' LIMIT 1), 'user-vatandas', 'Safranbolu', 'safranbolu-id-123',
    'LOW', 'Park alanında temizlik ihtiyacı.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'
),
(
    'mock-rep-4', 'Kaldırım Hasarı', 'Kaymakamlık önündeki kaldırım taşları yerinden oynamış.',
    ST_SetSRID(ST_MakePoint(32.682, 41.252), 4326), 'PENDING',
    (SELECT id FROM report_categories WHERE name = 'Kaldırım Hasarı' LIMIT 1), 'user-vatandas', 'Safranbolu', 'safranbolu-id-123',
    'MEDIUM', 'Yaya yolunda takılma riski oluşturan hasar.', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'
),
(
    'mock-rep-5', 'Su Sızıntısı', 'Asfalttan su çıkıyor, boru patlamış olabilir.',
    ST_SetSRID(ST_MakePoint(32.686, 41.256), 4326), 'PROCESSING',
    (SELECT id FROM report_categories WHERE name = 'Diğer' LIMIT 1), 'user-vatandas', 'Safranbolu', 'safranbolu-id-123',
    'CRITICAL', 'Şebeke hattında olası patlak ve su kaybı.', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '2 hours'
);

INSERT INTO reports (id, title, description, location, report_status, category_id, reporter_id, district, municipality_id, created_at, updated_at)
VALUES
(
    'mock-rep-6', 'Hatalı Park', 'Otobüs durağının önüne araç park edilmiş.',
    ST_SetSRID(ST_MakePoint(28.978, 41.008), 4326), 'PENDING',
    (SELECT id FROM report_categories WHERE name = 'Park İhlali' LIMIT 1), 'uuid-admin-user', 'Fatih', NULL, NOW(), NOW()
),
(
    'mock-rep-7', 'Ağaç Devrilmesi', 'Fırtınadan dolayı yola ağaç devrildi.',
    ST_SetSRID(ST_MakePoint(29.025, 41.045), 4326), 'PENDING',
    (SELECT id FROM report_categories WHERE name = 'Diğer' LIMIT 1), 'uuid-admin-user', 'Beşiktaş', NULL, NOW(), NOW()
);

INSERT INTO report_history (id, report_id, old_status, new_status, changed_by_id, note, created_at)
VALUES
(gen_random_uuid()::varchar, 'mock-rep-2', 'PENDING', 'PROCESSING', 'user-safranbolu-admin', 'Saha ekibi görevlendirildi.', NOW() - INTERVAL '5 hours'),
(gen_random_uuid()::varchar, 'mock-rep-3', 'PENDING', 'PROCESSING', 'user-safranbolu-admin', 'Temizlik ekiplerine iletildi.', NOW() - INTERVAL '2 days'),
(gen_random_uuid()::varchar, 'mock-rep-3', 'PROCESSING', 'RESOLVED', 'user-safranbolu-saha', 'Çöpler alındı, alan temizlendi.', NOW() - INTERVAL '1 day'),
(gen_random_uuid()::varchar, 'mock-rep-5', 'PENDING', 'PROCESSING', 'user-safranbolu-admin', 'İSKİ ekipleri bölgeye sevk edildi.', NOW() - INTERVAL '2 hours');
