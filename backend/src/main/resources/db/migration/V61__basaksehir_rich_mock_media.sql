-- V61: Başakşehir mock verilerine fotoğraflı ihbarlar, kan/kayıp/eşya ilanları ve duyuru görselleri
-- Görseller: doğrudan erişilebilir HTTPS URL (yerel upload gerektirmez)

-- ---------------------------------------------------------------------------
-- 1. Duyuru kapak görselleri
-- ---------------------------------------------------------------------------
UPDATE municipality_announcements SET image_url = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80', updated_at = NOW()
WHERE id = 'ann-basaksehir-1';

UPDATE municipality_announcements SET image_url = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80', updated_at = NOW()
WHERE id = 'ann-basaksehir-2';

UPDATE municipality_announcements SET image_url = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80', updated_at = NOW()
WHERE id = 'ann-basaksehir-3';

-- ---------------------------------------------------------------------------
-- 2. Ek vatandaş (çeşitli ilan sahipleri)
-- ---------------------------------------------------------------------------
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, district, municipality_id, created_at, updated_at)
VALUES (
    'uuid-vatandas-basaksehir-2',
    'mehmet_basaksehir@test.com',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Mehmet',
    'Yılmaz',
    '05554443322',
    true,
    'Başakşehir',
    'uuid-basaksehir-belediyesi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    enabled = true,
    municipality_id = EXCLUDED.municipality_id,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT 'uuid-vatandas-basaksehir-2', r.id FROM roles r WHERE r.name = 'ROLE_CITIZEN'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Kan ilanları (mevcut + yeni)
-- ---------------------------------------------------------------------------
INSERT INTO blood_search_ads (id, user_id, blood_type, hospital_name, hospital_district, patient_name, contact_phone, description, created_at)
VALUES
    ('bl-basaksehir-1', 'uuid-vatandas-basaksehir', 'A Rh+', 'Başakşehir Çam ve Sakura Şehir Hastanesi', 'Başakşehir', 'Ayşe Demir', '05551112233', 'Çok acil kalp ameliyatı için 3 ünite A Rh+ tam kan aranmaktadır. Son 30 günde kan vermemiş gönüllüler aranır.', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
    ('bl-basaksehir-2', 'uuid-vatandas-basaksehir', '0 Rh-', 'Kanuni Sultan Süleyman Hastanesi', 'Başakşehir', 'Ali Veli', '05553334455', 'Lösemi tedavisi gören 8 yaşındaki çocuk hastamız için acil 0 Rh- trombosit aranıyor.', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('bl-basaksehir-3', 'uuid-vatandas-basaksehir-2', 'B Rh+', 'Başakşehir Devlet Hastanesi', 'Başakşehir', 'Fatma Koç', '05556667788', 'Doğum sonrası kan kaybı nedeniyle B Rh+ tam kan acilen gerekiyor. Yakınlarımız arıyoruz.', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    ('bl-basaksehir-4', 'uuid-vatandas-basaksehir-2', 'AB Rh-', 'Medicana Bahçelievler', 'Başakşehir', 'Emre Can', '05558889900', 'Nadir kan grubu AB Rh- için acil platelet aranıyor. Lütfen paylaşın.', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
    ('bl-basaksehir-5', 'uuid-vatandas-basaksehir', 'A Rh-', 'Başakşehir Çam ve Sakura Şehir Hastanesi', 'Başakşehir', 'Zeynep Arslan', '05552221100', 'Kemoterapi sürecindeki annemiz için A Rh- kan aranıyor. Her paylaşım umut demek.', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET
    description = EXCLUDED.description,
    created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- 4. Kayıp evcil hayvan ilanları (fotoğraflı)
-- ---------------------------------------------------------------------------
INSERT INTO lost_pet_ads (id, user_id, pet_name, pet_type, breed, last_seen_district, contact_phone, description, media_url, created_at)
VALUES
    ('pet-basaksehir-1', 'uuid-vatandas-basaksehir', 'Dost', 'Köpek', 'Golden Retriever', 'Başakşehir', '05559998877', 'Başakşehir 4. Etap parkı yakınında tasmalı halde kayboldu. Kulağında mavi künye var, çok insan sever.', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '8 hours'),
    ('pet-basaksehir-2', 'uuid-vatandas-basaksehir-2', 'Pamuk', 'Kedi', 'Tekir', 'Başakşehir', '05554443322', 'Kayaşehir 20. Bölge site girişinde son görüldü. Beyaz patili, yeşil tasmalı dişi kedi. Komşularımız arıyor.', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('pet-basaksehir-3', 'uuid-vatandas-basaksehir', 'Cici', 'Kedi', 'Van Kedisi', 'Başakşehir', '05559992211', 'Bahçeşehir 2. Kısım market önünde kayboldu. Tek gözü mavi, diğeri yeşil. Ailesi çok üzgün.', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
    ('pet-basaksehir-4', 'uuid-vatandas-basaksehir-2', 'Karabaş', 'Köpek', 'Kangal', 'Başakşehir', '05556667788', 'Şahintepe mahallesi yeşil alan yanında son görüldü. Büyük boy, sarı tasmalı. Çoban köpeği, zararsızdır.', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (id) DO UPDATE SET
    media_url = EXCLUDED.media_url,
    description = EXCLUDED.description,
    created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- 5. Eşya bağış ilanları (fotoğraflı)
-- ---------------------------------------------------------------------------
INSERT INTO item_donation_ads (id, user_id, item_title, category, district, item_condition, contact_phone, description, media_url, created_at)
VALUES
    ('item-basaksehir-1', 'uuid-vatandas-basaksehir', 'Çocuk Bisikleti (16 Jant)', 'Oyuncak / kitap', 'Başakşehir', 'İyi', '05557776655', 'Kızımın büyüdüğü için artık binmediği bisikleti ihtiyacı olan bir aileye hediye etmek istiyoruz.', 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('item-basaksehir-2', 'uuid-vatandas-basaksehir-2', 'Bebek Arabası', 'Bebek / çocuk', 'Başakşehir', 'Az kullanılmış', '05554443322', 'Temiz, katlanabilir bebek arabası. Yeni doğan ailelerine ücretsiz verilecektir.', 'https://images.unsplash.com/photo-1515488764276-beab8bb27cfe?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('item-basaksehir-3', 'uuid-vatandas-basaksehir', 'Kışlık Mont (L Beden)', 'Giyim', 'Başakşehir', 'İyi', '05559992211', 'Erkek kışlık mont, yıkanmış ve paketlenmiş. İhtiyaç sahibine teslim edilebilir.', 'https://images.unsplash.com/photo-1539533018447-63fcce267608?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
    ('item-basaksehir-4', 'uuid-vatandas-basaksehir-2', 'Çalışma Masası + Sandalye', 'Mobilya', 'Başakşehir', 'Orta', '05556667788', 'Ev taşınması nedeniyle öğrenci masası ve sandalye seti verilecek. Kendi imkanıyla alınabilir.', 'https://images.unsplash.com/photo-1518459031867-a89b944aefe0?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('item-basaksehir-5', 'uuid-vatandas-basaksehir', 'Okul Çantası Seti', 'Oyuncak / kitap', 'Başakşehir', 'Yeni', '05552221100', 'İlkokul öğrencisi için sıfır çanta, kalem kutusu ve defter seti. Başakşehir içi teslim.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '10 hours')
ON CONFLICT (id) DO UPDATE SET
    media_url = EXCLUDED.media_url,
    description = EXCLUDED.description,
    created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- 6. Mevcut ihbarlara AI özeti + fotoğraf
-- ---------------------------------------------------------------------------
UPDATE reports SET
    ai_priority = 'HIGH',
    ai_summary = 'Metro çıkışı ana yolda derin çukur; araç lastiği hasarı riski yüksek.',
    updated_at = NOW()
WHERE id = 'rep-basaksehir-1';

UPDATE reports SET
    ai_priority = 'MEDIUM',
    ai_summary = 'Park yürüyüş yolunda taşan çöp konteynerleri; koku şikayeti mevcut.',
    updated_at = NOW()
WHERE id = 'rep-basaksehir-2';

UPDATE reports SET
    ai_priority = 'LOW',
    ai_summary = 'Kaldırım taşları onarıldı; vatandaş memnuniyeti sağlandı.',
    updated_at = NOW()
WHERE id = 'rep-basaksehir-3';

UPDATE reports SET
    ai_priority = 'HIGH',
    ai_summary = 'Site girişinde sokak aydınlatması tamamen kapalı; güvenlik riski.',
    updated_at = NOW()
WHERE id = 'rep-basaksehir-4';

INSERT INTO report_media (id, image_url, public_id, report_id, created_at, updated_at)
VALUES
    ('media-bs-1', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80', NULL, 'rep-basaksehir-1', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    ('media-bs-2', 'https://images.unsplash.com/photo-1530587190835-4d48d079eded?w=900&q=80', NULL, 'rep-basaksehir-2', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('media-bs-3', 'https://images.unsplash.com/photo-1568484717939-19578746a550?w=900&q=80', NULL, 'rep-basaksehir-3', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('media-bs-4', 'https://images.unsplash.com/photo-1519587583777-703d53fd3346?w=900&q=80', NULL, 'rep-basaksehir-4', CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours')
ON CONFLICT (id) DO UPDATE SET
    image_url = EXCLUDED.image_url,
    updated_at = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- 7. Ek ihbarlar (fotoğraflı, farklı durumlar)
-- ---------------------------------------------------------------------------
INSERT INTO reports (
    id, title, description, location, report_status, category_id, reporter_id, assignee_id,
    municipality_id, district, content_language, ai_priority, ai_summary,
    created_at, updated_at, kvkk_approved, kvkk_approved_at
)
VALUES
    (
        'rep-basaksehir-5',
        'Millet Bahçesi Bankları Kırık',
        'Başakşehir Millet Bahçesi çocuk oyun alanı yanındaki ahşap bankların birinde oturma yeri kırılmış, vida uçları dışarıda. Çocuklar için tehlikeli.',
        ST_SetSRID(ST_MakePoint(28.7865, 41.0998), 4326),
        'PROCESSING',
        (SELECT id FROM report_categories WHERE name = 'Park İhlali' LIMIT 1),
        'uuid-vatandas-basaksehir-2',
        'user-basaksehir-saha',
        'uuid-basaksehir-belediyesi',
        'Başakşehir',
        'tr',
        'MEDIUM',
        'Park bankında kırık oturma ve açıkta vida; çocuk güvenliği riski.',
        CURRENT_TIMESTAMP - INTERVAL '18 hours',
        CURRENT_TIMESTAMP - INTERVAL '4 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '18 hours'
    ),
    (
        'rep-basaksehir-6',
        'Kaldırım Üzerine Park Edilmiş Araçlar',
        'Şahintepe Mahallesi 15. Sokak girişinde iki araç yaya kaldırımını tamamen kapatıyor. Bebek arabası ve tekerlekli sandalye geçişi imkansız.',
        ST_SetSRID(ST_MakePoint(28.7788, 41.0955), 4326),
        'PENDING',
        (SELECT id FROM report_categories WHERE name = 'İşgal/Engel' LIMIT 1),
        'uuid-vatandas-basaksehir',
        NULL,
        'uuid-basaksehir-belediyesi',
        'Başakşehir',
        'tr',
        'HIGH',
        'Kaldırım tamamen işgal; engelli ve bebek arabası geçişi yok.',
        CURRENT_TIMESTAMP - INTERVAL '7 hours',
        CURRENT_TIMESTAMP - INTERVAL '7 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '7 hours'
    ),
    (
        'rep-basaksehir-7',
        'Metro Durağı Çöp Kovası Devrilmiş',
        'Başakşehir-Şehir Hastanesi metro istasyonu A çıkışındaki çöp kovası devrilmiş, etrafa dağılmış. Acil temizlik gerekiyor.',
        ST_SetSRID(ST_MakePoint(28.7925, 41.0972), 4326),
        'RESOLVED',
        (SELECT id FROM report_categories WHERE name = 'Çöp/Atık' LIMIT 1),
        'uuid-vatandas-basaksehir-2',
        'user-basaksehir-saha',
        'uuid-basaksehir-belediyesi',
        'Başakşehir',
        'tr',
        'LOW',
        'Metro çıkışında devrilmiş çöp kovası; temizlik tamamlandı.',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '6 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    ),
    (
        'rep-basaksehir-8',
        'Duvar Üzerine Graffiti',
        'Kayaşehir 18. Bölge ortaokul yanındaki belediye duvarına sprey boya ile yazılar yapılmış. Okul çıkış saatinde çocukların gördüğü alan.',
        ST_SetSRID(ST_MakePoint(28.7732, 41.0918), 4326),
        'REJECTED',
        (SELECT id FROM report_categories WHERE name = 'Park İhlali' LIMIT 1),
        'uuid-vatandas-basaksehir',
        NULL,
        'uuid-basaksehir-belediyesi',
        'Başakşehir',
        'tr',
        'LOW',
        'Graffiti şikayeti; özel mülk sınırı nedeniyle yönlendirildi.',
        CURRENT_TIMESTAMP - INTERVAL '4 days',
        CURRENT_TIMESTAMP - INTERVAL '3 days',
        true,
        CURRENT_TIMESTAMP - INTERVAL '4 days'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO report_media (id, image_url, public_id, report_id, created_at, updated_at)
VALUES
    ('media-bs-5', 'https://images.unsplash.com/photo-1560382588-f55fab9e289d?w=900&q=80', NULL, 'rep-basaksehir-5', CURRENT_TIMESTAMP - INTERVAL '18 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
    ('media-bs-6', 'https://images.unsplash.com/photo-1506528430110-a0223f4201f3?w=900&q=80', NULL, 'rep-basaksehir-6', CURRENT_TIMESTAMP - INTERVAL '7 hours', CURRENT_TIMESTAMP - INTERVAL '7 hours'),
    ('media-bs-7', 'https://images.unsplash.com/photo-1621451537094-891c466f25c8?w=900&q=80', NULL, 'rep-basaksehir-7', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
    ('media-bs-8', 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c0?w=900&q=80', NULL, 'rep-basaksehir-8', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO report_history (id, report_id, old_status, new_status, changed_by_id, note, created_at)
VALUES
    ('hist-bs-8', 'rep-basaksehir-5', NULL, 'PENDING', 'uuid-vatandas-basaksehir-2', 'İhbar oluşturuldu · ilçe: Başakşehir', CURRENT_TIMESTAMP - INTERVAL '18 hours'),
    ('hist-bs-9', 'rep-basaksehir-5', 'PENDING', 'PROCESSING', 'user-basaksehir-admin', 'Saha görevlisi atandı: Mustafa Saha', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
    ('hist-bs-10', 'rep-basaksehir-6', NULL, 'PENDING', 'uuid-vatandas-basaksehir', 'İhbar oluşturuldu · ilçe: Başakşehir', CURRENT_TIMESTAMP - INTERVAL '7 hours'),
    ('hist-bs-11', 'rep-basaksehir-7', NULL, 'PENDING', 'uuid-vatandas-basaksehir-2', 'İhbar oluşturuldu · ilçe: Başakşehir', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('hist-bs-12', 'rep-basaksehir-7', 'PENDING', 'PROCESSING', 'user-basaksehir-admin', 'Temizlik ekibi yönlendirildi', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('hist-bs-13', 'rep-basaksehir-7', 'PROCESSING', 'RESOLVED', 'user-basaksehir-saha', 'Alan temizlendi, kova yeniden sabitlendi.', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
    ('hist-bs-14', 'rep-basaksehir-8', NULL, 'PENDING', 'uuid-vatandas-basaksehir', 'İhbar oluşturuldu · ilçe: Başakşehir', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('hist-bs-15', 'rep-basaksehir-8', 'PENDING', 'REJECTED', 'user-basaksehir-admin', 'Duvar özel mülk sınırında; ilgili kuruma yönlendirildi.', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Anket örnek oyları
-- ---------------------------------------------------------------------------
INSERT INTO municipality_survey_votes (id, survey_id, user_id, selected_option, created_at)
VALUES
    ('vote-bs-1', 'srv-basaksehir-1', 'uuid-vatandas-basaksehir', 1, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('vote-bs-2', 'srv-basaksehir-1', 'uuid-vatandas-basaksehir-2', 2, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('vote-bs-3', 'srv-basaksehir-2', 'uuid-vatandas-basaksehir', 1, CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;
