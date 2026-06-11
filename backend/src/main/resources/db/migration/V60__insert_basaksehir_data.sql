-- V60__insert_basaksehir_data.sql
-- İstanbul Başakşehir Belediyesi ve Zengin Mock Verileri

-- 1. Başakşehir Belediyesi Ekleme (Mavi/Sarı Akıllı Belediye Teması)
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
    'uuid-basaksehir-belediyesi',
    'Başakşehir Belediyesi',
    'DISTRICT',
    41.0967,
    28.7847,
    13,
    ST_Buffer(ST_SetSRID(ST_MakePoint(28.7847, 41.0967), 4326)::geography, 15000)::geometry,
    'basaksehir',
    'Başakşehir',
    true,
    true,
    true,
    '#1d4ed8', -- Birincil: Kentiva Mavisi
    '#1e40af', -- İkincil: Koyu Mavi
    '#f59e0b', -- Vurgu: Amber/Sarı
    'Mutluluğun Şehri Başakşehir',
    'DEPARTMENTAL',
    'BASAKSEHIR',
    'ENTERPRISE',
    '2035-12-31 23:59:59',
    'istanbul',
    'basaksehir',
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

-- 2. Başakşehir Belediyesi Departmanları
INSERT INTO departments (id, name, description, active, created_at, updated_at, municipality_id, slug)
VALUES 
    ('dept-basaksehir-fen', 'Fen İşleri Müdürlüğü', 'Yol, asfalt ve kaldırım onarım işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'uuid-basaksehir-belediyesi', 'fen-isleri'),
    ('dept-basaksehir-cevre', 'Temizlik ve Çevre İşleri', 'Çöp toplama ve çevre temizlik işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'uuid-basaksehir-belediyesi', 'cevre-koruma-ve-temizlik'),
    ('dept-basaksehir-ulasim', 'Ulaşım Hizmetleri', 'Toplu taşıma ve durak düzenlemeleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'uuid-basaksehir-belediyesi', 'ulasim-hizmetleri'),
    ('dept-basaksehir-zabita', 'Zabıta Müdürlüğü', 'Denetim, işgal ve zabıta kontrol işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'uuid-basaksehir-belediyesi', 'zabita-mudurlugu')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    slug = EXCLUDED.slug,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Başakşehir Kullanıcıları (Şifre: admin123)
-- Admin
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, district, municipality_id, created_at, updated_at)
VALUES (
    'user-basaksehir-admin',
    'admin@basaksehir.bel.tr',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Başakşehir',
    'Admin',
    '05552223344',
    true,
    'Başakşehir',
    'uuid-basaksehir-belediyesi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    enabled = true,
    municipality_id = EXCLUDED.municipality_id,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-basaksehir-admin', r.id FROM roles r WHERE r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;

-- Saha Görevlisi
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, department_id, district, municipality_id, created_at, updated_at)
VALUES (
    'user-basaksehir-saha',
    'saha@basaksehir.bel.tr',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Mustafa',
    'Saha',
    '05553334455',
    true,
    'dept-basaksehir-fen',
    'Başakşehir',
    'uuid-basaksehir-belediyesi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    enabled = true,
    department_id = EXCLUDED.department_id,
    municipality_id = EXCLUDED.municipality_id,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-basaksehir-saha', r.id FROM roles r WHERE r.name = 'ROLE_FIELD_OFFICER'
ON CONFLICT DO NOTHING;

-- Vatandaş
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, district, municipality_id, created_at, updated_at)
VALUES (
    'uuid-vatandas-basaksehir',
    'vatandas_basaksehir@test.com',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Kaan',
    'Başakşehirli',
    '05559992211',
    true,
    'Başakşehir',
    'uuid-basaksehir-belediyesi',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    enabled = true,
    municipality_id = EXCLUDED.municipality_id,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT 'uuid-vatandas-basaksehir', r.id FROM roles r WHERE r.name = 'ROLE_CITIZEN'
ON CONFLICT DO NOTHING;


-- 4. Başakşehir Belediyesi Duyuruları (Mock — kapak görselli)
INSERT INTO municipality_announcements (id, municipality_id, title, content, image_url, starts_at, active, created_at, updated_at)
VALUES
    ('ann-basaksehir-1', 'uuid-basaksehir-belediyesi', 'Başakşehir Millet Bahçesi Etkinlikleri Başlıyor', 'Belediyemiz tarafından düzenlenen yaz konserleri ve sinema geceleri bu cuma Millet Bahçesi amfi tiyatroda başlıyor. Tüm halkımız davetlidir.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80', NOW(), true, NOW(), NOW()),
    ('ann-basaksehir-2', 'uuid-basaksehir-belediyesi', 'Akıllı Belediyecilik Kentiva Sistemi Yayında!', 'Siz değerli komşularımıza daha iyi hizmet vermek için geliştirdiğimiz Kentiva mobil uygulamamız yayına girdi. Tüm arıza ve isteklerinizi anında iletebilirsiniz.', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80', NOW(), true, NOW(), NOW()),
    ('ann-basaksehir-3', 'uuid-basaksehir-belediyesi', 'Bahçeşehir Gölet Park Bakım ve Peyzaj Çalışmaları', 'Bahçeşehir Gölet bölgesinde başlattığımız kapsamlı çevre düzenlemesi ve rekreasyon alanı yenileme çalışmaları nedeniyle bazı yollar geçici olarak yaya trafiğine kapatılmıştır.', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80', NOW(), true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW();


-- 5. Başakşehir Belediyesi Anketleri (Mock)
INSERT INTO municipality_surveys (id, municipality_id, title, description, option1, option2, option3, option4, active, created_at, updated_at)
VALUES
    ('srv-basaksehir-1', 'uuid-basaksehir-belediyesi', 'Başakşehir genelinde yeni kurulacak bisiklet yolları projesini nasıl değerlendiriyorsunuz?', 'İlçe ulaşım planlamamıza fikirlerinizle yön verin.', 'Çok Başarılı', 'Geliştirilmeli', 'Yetersiz', 'Kararsız', true, NOW(), NOW()),
    ('srv-basaksehir-2', 'uuid-basaksehir-belediyesi', 'Kültür merkezlerimizdeki sanatsal faaliyetlerin çeşitliliğinden memnun musunuz?', 'Yeni dönem eğitim ve etkinliklerimizi belirlemek için oyunuzu verin.', 'Evet, memnunum', 'Kısmen memnunum', 'Hayır, memnun değilim', NULL, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- 6. Başakşehir Bölgesi Sosyal İlanlar (Mock C2C)
-- Kan Bağışları
INSERT INTO blood_search_ads (id, user_id, blood_type, hospital_name, hospital_district, patient_name, contact_phone, description, created_at)
VALUES
    ('bl-basaksehir-1', 'uuid-vatandas-basaksehir', 'A Rh+', 'Başakşehir Çam ve Sakura Şehir Hastanesi', 'Başakşehir', 'Ayşe Demir', '05551112233', 'Çok acil kalp ameliyatı için 3 ünite A Rh+ tam kan aranmaktadır.', NOW()),
    ('bl-basaksehir-2', 'uuid-vatandas-basaksehir', '0 Rh-', 'Kanuni Sultan Süleyman Hastanesi', 'Başakşehir', 'Ali Veli', '05553334455', 'Lösemi tedavisi gören çocuk hastamız için trombosit kan aranıyor.', NOW())
ON CONFLICT (id) DO NOTHING;

-- Kayıp Evcil Hayvan (fotoğraflı)
INSERT INTO lost_pet_ads (id, user_id, pet_name, pet_type, breed, last_seen_district, contact_phone, description, media_url, created_at)
VALUES
    ('pet-basaksehir-1', 'uuid-vatandas-basaksehir', 'Dost', 'Köpek', 'Golden Retriever', 'Başakşehir', '05559998877', 'Başakşehir 4. Etap civarında tasmadaki künyesiyle kaybolmuştur. İnsancıldır.', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80', NOW())
ON CONFLICT (id) DO UPDATE SET media_url = EXCLUDED.media_url;

-- Eşya Bağış (fotoğraflı)
INSERT INTO item_donation_ads (id, user_id, item_title, category, district, item_condition, contact_phone, description, media_url, created_at)
VALUES
    ('item-basaksehir-1', 'uuid-vatandas-basaksehir', 'Çocuk Bisikleti (16 Jant)', 'Oyuncak / kitap', 'Başakşehir', 'İyi', '05557776655', 'Kızımın büyüdüğü için artık binmediği bisikletini ihtiyacı olan bir aileye hediye etmek istiyoruz.', 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80', NOW())
ON CONFLICT (id) DO UPDATE SET media_url = EXCLUDED.media_url;


-- 7. Mock Vatandaş Başvuruları (Raporlar)
INSERT INTO reports (
    id, 
    title, 
    description, 
    location, 
    report_status, 
    category_id, 
    reporter_id, 
    assignee_id, 
    municipality_id, 
    district, 
    content_language, 
    created_at, 
    updated_at,
    kvkk_approved,
    kvkk_approved_at
)
VALUES
    -- Rapor 1 (Yol Çukuru)
    (
        'rep-basaksehir-1',
        'Başakşehir Yolu 3. Kısımda Derin Çukur',
        'Başakşehir 3. etap metro istasyonu yakınındaki ana yolda çok derin bir çukur oluşmuş, araçların lastiğine zarar veriyor. Acil asfalt yaması gerekiyor.',
        ST_SetSRID(ST_MakePoint(28.7891, 41.0982), 4326),
        'PENDING',
        (SELECT id FROM report_categories WHERE name = 'Yol Çukuru' LIMIT 1),
        'uuid-vatandas-basaksehir',
        NULL,
        'uuid-basaksehir-belediyesi',
        'Başakşehir',
        'tr',
        CURRENT_TIMESTAMP - INTERVAL '3 hours',
        CURRENT_TIMESTAMP - INTERVAL '3 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '3 hours'
    ),
    -- Rapor 2 (Çöp / Atık)
    (
        'rep-basaksehir-2',
        'Park Çevresinde Çöp Yığınları',
        'Bahçeşehir Gölet Parkı yürüyüş yolu kenarındaki konteynerler tamamen taşmış ve etrafa kötü kokular yayıyor. Temizlik ekibinin uğraması gerekiyor.',
        ST_SetSRID(ST_MakePoint(28.7812, 41.1011), 4326),
        'PROCESSING',
        (SELECT id FROM report_categories WHERE name = 'Çöp/Atık' LIMIT 1),
        'uuid-vatandas-basaksehir',
        'user-basaksehir-saha', -- Atanan saha görevlisi
        'uuid-basaksehir-belediyesi',
        'Başakşehir',
        'tr',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        CURRENT_TIMESTAMP - INTERVAL '2 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    ),
    -- Rapor 3 (Kaldırım Hasarı)
    (
        'rep-basaksehir-3',
        'Olimpiyat Stadı Yolu Kaldırım Taşları Sökülmüş',
        'Stada giden yaya yolu üzerindeki kaldırım taşları yerinden oynamış ve kırılmış, yürürken takılıp düşme tehlikesi var.',
        ST_SetSRID(ST_MakePoint(28.7915, 41.0945), 4326),
        'RESOLVED',
        (SELECT id FROM report_categories WHERE name = 'Kaldırım Hasarı' LIMIT 1),
        'uuid-vatandas-basaksehir',
        'user-basaksehir-saha',
        'uuid-basaksehir-belediyesi',
        'Başakşehir',
        'tr',
        CURRENT_TIMESTAMP - INTERVAL '3 days',
        CURRENT_TIMESTAMP - INTERVAL '1 day',
        true,
        CURRENT_TIMESTAMP - INTERVAL '3 days'
    ),
    -- Rapor 4 (Sokak Lambası Arızası)
    (
        'rep-basaksehir-4',
        'Sokak Lambaları Yanmıyor',
        'Kayaşehir 15. Bölge A kapısının önündeki aydınlatma direklerinin hiçbiri dün akşamdan beri çalışmıyor. Sokak zifiri karanlık kalıyor.',
        ST_SetSRID(ST_MakePoint(28.7750, 41.0921), 4326),
        'PENDING',
        (SELECT id FROM report_categories WHERE name = 'Sokak Lambası Arızası' LIMIT 1),
        'uuid-vatandas-basaksehir',
        NULL,
        'uuid-basaksehir-belediyesi',
        'Başakşehir',
        'tr',
        CURRENT_TIMESTAMP - INTERVAL '5 hours',
        CURRENT_TIMESTAMP - INTERVAL '5 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '5 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- Rapor Tarihçeleri
INSERT INTO report_history (id, report_id, old_status, new_status, changed_by_id, note, created_at)
VALUES
    ('hist-bs-1', 'rep-basaksehir-1', NULL, 'PENDING', 'uuid-vatandas-basaksehir', 'İhbar oluşturuldu · ilçe: Başakşehir', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    
    ('hist-bs-2', 'rep-basaksehir-2', NULL, 'PENDING', 'uuid-vatandas-basaksehir', 'İhbar oluşturuldu · ilçe: Başakşehir', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('hist-bs-3', 'rep-basaksehir-2', 'PENDING', 'PROCESSING', 'user-basaksehir-admin', 'Saha görevlisi atandı: Mustafa Saha', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    
    ('hist-bs-4', 'rep-basaksehir-3', NULL, 'PENDING', 'uuid-vatandas-basaksehir', 'İhbar oluşturuldu · ilçe: Başakşehir', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('hist-bs-5', 'rep-basaksehir-3', 'PENDING', 'PROCESSING', 'user-basaksehir-admin', 'Saha görevlisi atandı: Mustafa Saha', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('hist-bs-6', 'rep-basaksehir-3', 'PROCESSING', 'RESOLVED', 'user-basaksehir-saha', 'Kaldırım taşları yenilenerek sorun giderildi.', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    
    ('hist-bs-7', 'rep-basaksehir-4', NULL, 'PENDING', 'uuid-vatandas-basaksehir', 'İhbar oluşturuldu · ilçe: Başakşehir', CURRENT_TIMESTAMP - INTERVAL '5 hours')
ON CONFLICT (id) DO NOTHING;

-- 8. İhbar fotoğrafları (report_media)
INSERT INTO report_media (id, image_url, public_id, report_id, created_at, updated_at)
VALUES
    ('media-bs-1', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80', NULL, 'rep-basaksehir-1', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    ('media-bs-2', 'https://images.unsplash.com/photo-1530587190835-4d48d079eded?w=900&q=80', NULL, 'rep-basaksehir-2', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('media-bs-3', 'https://images.unsplash.com/photo-1568484717939-19578746a550?w=900&q=80', NULL, 'rep-basaksehir-3', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('media-bs-4', 'https://images.unsplash.com/photo-1519587583777-703d53fd3346?w=900&q=80', NULL, 'rep-basaksehir-4', CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours')
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = EXCLUDED.updated_at;
