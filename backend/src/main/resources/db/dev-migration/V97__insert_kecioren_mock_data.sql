-- Keçiören Belediyesi Özel ve Özelleştirilmiş Mock Verileri

-- 1. Keçiören Belediyesi Ekleme (Lacivert/Altın temalı, entegrasyonlar ve widget'lar aktif)
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
    '0857962c-79c4-4f56-b5e8-7aead69477b5',
    'Keçiören Belediyesi',
    'DISTRICT',
    40.0016,
    32.8631,
    13,
    ST_Buffer(ST_SetSRID(ST_MakePoint(32.8631, 40.0016), 4326)::geography, 15000)::geometry,
    'kecioren',
    'Keçiören',
    true,
    true,
    true,
    '#1e3a8a', -- Birincil: Lacivert (Blue-900)
    '#f59e0b', -- İkincil: Altın/Amber (Amber-500)
    '#ef4444', -- Vurgu: Kırmızı (Red-500)
    'Halka Hizmet, Hakka Hizmettir',
    'DEPARTMENTAL', -- Departmanlı Mod
    'KECIOREN',
    'ENTERPRISE',
    '2030-12-31 23:59:59',
    'ankara',
    'kecioren',
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

-- 2. Keçiören Belediyesi Departmanları
INSERT INTO departments (id, name, description, active, created_at, updated_at, municipality_id, slug)
VALUES 
    ('dept-kecioren-fen', 'Fen İşleri Müdürlüğü', 'Yol, asfalt ve kaldırım onarım işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '0857962c-79c4-4f56-b5e8-7aead69477b5', 'fen-isleri'),
    ('dept-kecioren-cevre', 'Temizlik ve Çevre İşleri', 'Çöp toplama ve çevre temizlik işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '0857962c-79c4-4f56-b5e8-7aead69477b5', 'cevre-koruma-ve-temizlik'),
    ('dept-kecioren-ulasim', 'Ulaşım Hizmetleri', 'Toplu taşıma ve durak düzenlemeleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '0857962c-79c4-4f56-b5e8-7aead69477b5', 'ulasim-hizmetleri'),
    ('dept-kecioren-zabita', 'Zabıta Müdürlüğü', 'Denetim, işgal ve zabıta kontrol işleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '0857962c-79c4-4f56-b5e8-7aead69477b5', 'zabita-mudurlugu')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    slug = EXCLUDED.slug,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Yetkililer ve Test Kullanıcıları
-- Şifre: admin123 (Bcrypt Hash: $2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2)

-- A. Keçiören Admin Kullanıcısı (Var olan kullanıcıyı güncelle veya yeni kullanıcı)
UPDATE app_users SET
    password = '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    enabled = true,
    first_name = 'Talha',
    last_name = 'Kurul',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '5c988cf6-daa7-48d5-abda-a32d0d563644';

INSERT INTO user_roles (user_id, role_id)
SELECT '5c988cf6-daa7-48d5-abda-a32d0d563644', r.id FROM roles r WHERE r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;

-- B. Keçiören Saha Görevlisi (Ahmet)
UPDATE app_users SET
    password = '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    enabled = true,
    department_id = 'dept-kecioren-fen',
    first_name = 'Ahmet',
    last_name = 'Saha',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '0268d68b-9978-4e17-9f19-83e5617136e9';

INSERT INTO user_roles (user_id, role_id)
SELECT '0268d68b-9978-4e17-9f19-83e5617136e9', r.id FROM roles r WHERE r.name = 'ROLE_FIELD_OFFICER'
ON CONFLICT DO NOTHING;

-- C. Keçiören Vatandaş Kullanıcısı
INSERT INTO app_users (id, email, password, first_name, last_name, phone_number, enabled, district, municipality_id, created_at, updated_at)
VALUES (
    'user-kecioren-vatandas',
    'kecioren_vatandas@test.com',
    '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    'Veli',
    'Kaya',
    '05559990033',
    true,
    'Keçiören',
    '0857962c-79c4-4f56-b5e8-7aead69477b5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    enabled = true,
    municipality_id = EXCLUDED.municipality_id,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT 'user-kecioren-vatandas', r.id FROM roles r WHERE r.name = 'ROLE_CITIZEN'
ON CONFLICT DO NOTHING;

-- 4. Örnek İhbarlar (Fotoğraflı)
INSERT INTO reports (
    id, title, description, location, report_status, category_id, reporter_id, assignee_id,
    municipality_id, district, content_language, ai_priority, ai_summary,
    created_at, updated_at, kvkk_approved, kvkk_approved_at
)
VALUES
    (
        'rep-kecioren-1',
        'Fatih Caddesi Çukur ve Yol Hasarı',
        'Fatih Caddesi No:45 önünde yolda derin bir çukur oluşmuş. Araçlar geçerken zarar görüyor ve kaza riski var. Acilen asfalt yama yapılması gerekiyor.',
        ST_SetSRID(ST_MakePoint(32.8640, 40.0020), 4326),
        'PROCESSING',
        (SELECT id FROM report_categories WHERE name = 'Yol Çukuru' LIMIT 1),
        'user-kecioren-vatandas',
        '0268d68b-9978-4e17-9f19-83e5617136e9', -- ahmet@saha.com
        '0857962c-79c4-4f56-b5e8-7aead69477b5',
        'Keçiören',
        'tr',
        'HIGH',
        'Ana caddede derin yol çukuru; araç ve sürüş güvenliği riski yüksek.',
        CURRENT_TIMESTAMP - INTERVAL '5 hours',
        CURRENT_TIMESTAMP - INTERVAL '2 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '5 hours'
    ),
    (
        'rep-kecioren-2',
        'Dutluk Parkı Çöpler Toplanmamış',
        'Dutluk Parkı içerisindeki çöp kutuları taşmış ve etrafa yayılmış durumda. Çevreye kötü koku yayılıyor, acil temizlik ekibi talep ediyoruz.',
        ST_SetSRID(ST_MakePoint(32.8620, 40.0030), 4326),
        'PENDING',
        (SELECT id FROM report_categories WHERE name = 'Çöp/Atık' LIMIT 1),
        'user-kecioren-vatandas',
        NULL,
        '0857962c-79c4-4f56-b5e8-7aead69477b5',
        'Keçiören',
        'tr',
        'MEDIUM',
        'Park içinde taşmış çöp kutuları; çevre kirliliği ve koku şikayeti.',
        CURRENT_TIMESTAMP - INTERVAL '12 hours',
        CURRENT_TIMESTAMP - INTERVAL '12 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '12 hours'
    ),
    (
        'rep-kecioren-3',
        'Sokak Lambası Arızası - Kızlarpınarı',
        'Kızlarpınarı Caddesi 12. Sokak girişindeki sokak lambası geceleri yanmıyor, sokak tamamen karanlık kalıyor.',
        ST_SetSRID(ST_MakePoint(32.8610, 40.0010), 4326),
        'RESOLVED',
        (SELECT id FROM report_categories WHERE name = 'Sokak Lambası Arızası' LIMIT 1),
        'user-kecioren-vatandas',
        '0268d68b-9978-4e17-9f19-83e5617136e9', -- ahmet@saha.com
        '0857962c-79c4-4f56-b5e8-7aead69477b5',
        'Keçiören',
        'tr',
        'LOW',
        'Sokak aydınlatması arızası; saha görevlisi tarafından ampul değişimi tamamlandı.',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '4 hours',
        true,
        CURRENT_TIMESTAMP - INTERVAL '2 days'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO report_media (id, image_url, public_id, report_id, created_at, updated_at)
VALUES
    ('media-ko-1', 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=900&q=80', NULL, 'rep-kecioren-1', CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    ('media-ko-2', 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=900&q=80', NULL, 'rep-kecioren-2', CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
    ('media-ko-3', 'https://images.unsplash.com/photo-1519587583777-703d53fd3346?w=900&q=80', NULL, 'rep-kecioren-3', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO report_history (id, report_id, old_status, new_status, changed_by_id, note, created_at)
VALUES
    ('hist-ko-1', 'rep-kecioren-1', NULL, 'PENDING', 'user-kecioren-vatandas', 'İhbar oluşturuldu · ilçe: Keçiören', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
    ('hist-ko-2', 'rep-kecioren-1', 'PENDING', 'PROCESSING', '5c988cf6-daa7-48d5-abda-a32d0d563644', 'Saha görevlisi atandı: Ahmet Saha', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    ('hist-ko-3', 'rep-kecioren-2', NULL, 'PENDING', 'user-kecioren-vatandas', 'İhbar oluşturuldu · ilçe: Keçiören', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
    ('hist-ko-4', 'rep-kecioren-3', NULL, 'PENDING', 'user-kecioren-vatandas', 'İhbar oluşturuldu · ilçe: Keçiören', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('hist-ko-5', 'rep-kecioren-3', 'PENDING', 'PROCESSING', '5c988cf6-daa7-48d5-abda-a32d0d563644', 'Arıza ekiplere iletildi', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('hist-ko-6', 'rep-kecioren-3', 'PROCESSING', 'RESOLVED', '0268d68b-9978-4e17-9f19-83e5617136e9', 'Sokak lambası ampulü yenisiyle değiştirildi, aydınlatma aktif duruma getirildi.', CURRENT_TIMESTAMP - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- 5. Duyurular (Duyuru kapak görselleri ile)
INSERT INTO municipality_announcements (id, municipality_id, title, content, image_url, starts_at, ends_at, active, created_at, updated_at, deleted)
VALUES
    ('ann-kecioren-1', '0857962c-79c4-4f56-b5e8-7aead69477b5', 'Keçiören Belediyesi Kültür Sanat Etkinlikleri', 'Belediyemiz tarafından her hafta sonu düzenlenen ücretsiz sinema ve tiyatro günleri bu hafta da devam ediyor. Tüm halkımız davetlidir.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&q=80', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
    ('ann-kecioren-2', '0857962c-79c4-4f56-b5e8-7aead69477b5', 'Yeni Parkımızın Açılışı', 'İlçemizin yeşil alan kapasitesini artırmak üzere yapılan yeni Dutluk Parkı açılış törenine tüm Keçiören sakinlerini bekliyoruz.', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '15 days', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false)
ON CONFLICT (id) DO NOTHING;

-- 6. Anketler
INSERT INTO municipality_surveys (id, municipality_id, title, description, option1, option2, option3, option4, active, created_at, updated_at, deleted)
VALUES
    ('srv-kecioren-1', '0857962c-79c4-4f56-b5e8-7aead69477b5', 'Mahallemizde Hangi Yatırıma Öncelik Verilmeli?', 'Keçiören genelinde belediyemizce bütçelendirilecek bir sonraki büyük projede önceliği hangisine vermeliyiz?', 'Yeni Yürüyüş Yolu ve Parklar', 'Kültür ve Gençlik Merkezleri', 'Daha Fazla Bisiklet Yolu', 'Sokak Aydınlatması İyileştirmeleri', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false)
ON CONFLICT (id) DO NOTHING;

-- 7. Sosyal İlanlar
INSERT INTO blood_search_ads (id, user_id, blood_type, hospital_name, hospital_district, patient_name, contact_phone, description, created_at, deleted)
VALUES
    ('bl-kecioren-1', 'user-kecioren-vatandas', '0 Rh+', 'Keçiören Eğitim Araştırma Hastanesi', 'Keçiören', 'Fatma Yılmaz', '05553332211', 'Acil ameliyat için 2 ünite 0 Rh+ kana ihtiyaç vardır. Kan verebileceklerin bizimle iletişime geçmesi rica olunur.', CURRENT_TIMESTAMP - INTERVAL '3 hours', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lost_pet_ads (id, user_id, pet_name, pet_type, breed, last_seen_district, contact_phone, description, media_url, created_at, deleted)
VALUES
    ('pet-kecioren-1', 'user-kecioren-vatandas', 'Minnoş', 'Kedi', 'Van Kedisi', 'Keçiören', '05554443322', 'Kızlarpınarı caddesi civarında kaybolmuştur. Bir gözü mavi diğeri yeşil, tasmalı ve çok uysaldır. Görenlerin araması rica olunur.', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80', CURRENT_TIMESTAMP - INTERVAL '1 day', false)
ON CONFLICT (id) DO NOTHING;
