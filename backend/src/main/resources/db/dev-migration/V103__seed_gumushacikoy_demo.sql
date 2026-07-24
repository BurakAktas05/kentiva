-- ============================================================
-- DEV/DEMO ONLY: Gümüşhacıköy Belediyesi uçtan uca örnek verisi
--
-- Bu dosya production Flyway yolunda değildir. Tüm kimlikler sabittir ve
-- INSERT/UPDATE işlemleri yeniden çalıştırıldığında kayıt çoğaltmaz.
-- Yerel hesapların ortak parolası scripts/GUMUSHACIKOY-DEMO-HESAPLARI.md
-- dosyasında belgelenmiştir.
-- ============================================================

-- Referans ilçe production kataloğunda da bulunur; eski/dev veritabanları için
-- burada ayrıca garanti edilir.
INSERT INTO turkey_districts (
    member_id, plate_code, district_slug, name_tr, boundary_status
) VALUES (
    '05-gumushacikoy', '05', 'gumushacikoy', 'Gümüşhacıköy', 'PENDING'
)
ON CONFLICT (member_id) DO UPDATE SET
    plate_code = EXCLUDED.plate_code,
    district_slug = EXCLUDED.district_slug,
    name_tr = EXCLUDED.name_tr;

-- Temiz veritabanında sabit kimlikle oluştur. Daha önce panelden oluşturulmuş
-- bir Gümüşhacıköy tenant'ı varsa slug/district eşleşmesi üzerinden onu koru.
INSERT INTO municipalities (
    id, created_at, updated_at, name, type, parent_id,
    center_lat, center_lng, default_zoom,
    slug, display_name, logo_url,
    primary_color, secondary_color, accent_color, slogan,
    contact_email, contact_phone, website_url,
    public_stats_enabled, active, onboarded,
    subscription_plan, subscription_ends_at,
    sms_resolved_template,
    push_rejected_title_template, push_rejected_body_template,
    sms_sender_header,
    sms_processing_template,
    push_processing_title_template, push_processing_body_template,
    sms_assigned_template,
    push_assigned_title_template, push_assigned_body_template,
    push_resolved_title_template, push_resolved_body_template,
    widget_city_slug, widget_district_slug,
    workflow_mode, mis_type,
    allow_municipality_rejection,
    reputation_delta_report_created,
    reputation_delta_report_resolved,
    reputation_delta_report_rejected,
    reputation_delta_inappropriate_media,
    auto_suspension_threshold, auto_suspension_days,
    ai_media_moderation_enabled,
    district_id
)
SELECT
    '05a00000-0000-4000-8000-000000000001',
    CURRENT_TIMESTAMP - INTERVAL '120 days', CURRENT_TIMESTAMP,
    'Gümüşhacıköy Belediyesi', 'DISTRICT', NULL,
    40.8730, 35.2140, 14,
    'gumushacikoy', 'Gümüşhacıköy Belediyesi', NULL,
    '#6366F1', '#4338CA', '#F59E0B',
    'Birlikte daha yaşanabilir Gümüşhacıköy',
    'demo.gumushacikoy@kentiva.local', '05000000005',
    'https://demo.kentiva.app/gumushacikoy',
    TRUE, TRUE, TRUE,
    'ENTERPRISE', CURRENT_TIMESTAMP + INTERVAL '365 days',
    '{belediye}: “{baslik}” başlıklı ihbarınız çözüldü. {not} {slogan}',
    'İhbarınız incelendi',
    '{baslik} başlıklı ihbarınız belediye görev alanı veya başvuru koşulları nedeniyle sonuçlandırılamadı.',
    'KENTIVA',
    '{belediye}: “{baslik}” başlıklı ihbarınız işleme alındı.',
    'İhbarınız işleme alındı',
    '{baslik} için ekiplerimiz değerlendirmeye başladı.',
    '{belediye}: “{baslik}” başlıklı ihbarınız saha ekibine atandı.',
    'Ekip görevlendirildi',
    '{baslik} için ilgili saha ekibi görevlendirildi.',
    'İhbarınız çözüldü',
    '{baslik} için çalışma tamamlandı. Geri bildiriminiz bizim için değerlidir.',
    'amasya', 'gumushacikoy',
    'DEPARTMENTAL', 'NONE',
    TRUE, 25, 50, -45, -70, 5, 30, TRUE,
    d.id
FROM turkey_districts d
WHERE d.member_id = '05-gumushacikoy'
  AND NOT EXISTS (
      SELECT 1
      FROM municipalities existing
      WHERE existing.slug = 'gumushacikoy'
         OR existing.district_id = d.id
  )
ON CONFLICT (id) DO NOTHING;

-- Mevcut veya yeni tenant'ı aynı kurumsal demo ayarlarına getir.
UPDATE municipalities m
SET
    updated_at = CURRENT_TIMESTAMP,
    name = 'Gümüşhacıköy Belediyesi',
    type = 'DISTRICT',
    center_lat = 40.8730,
    center_lng = 35.2140,
    default_zoom = 14,
    slug = 'gumushacikoy',
    display_name = 'Gümüşhacıköy Belediyesi',
    primary_color = '#6366F1',
    secondary_color = '#4338CA',
    accent_color = '#F59E0B',
    slogan = 'Birlikte daha yaşanabilir Gümüşhacıköy',
    contact_email = 'demo.gumushacikoy@kentiva.local',
    contact_phone = '05000000005',
    website_url = 'https://demo.kentiva.app/gumushacikoy',
    public_stats_enabled = TRUE,
    active = TRUE,
    onboarded = TRUE,
    subscription_plan = 'ENTERPRISE',
    subscription_ends_at = GREATEST(
        COALESCE(m.subscription_ends_at, CURRENT_TIMESTAMP),
        CURRENT_TIMESTAMP + INTERVAL '365 days'
    ),
    sms_resolved_template = '{belediye}: “{baslik}” başlıklı ihbarınız çözüldü. {not} {slogan}',
    push_rejected_title_template = 'İhbarınız incelendi',
    push_rejected_body_template = '{baslik} başlıklı ihbarınız belediye görev alanı veya başvuru koşulları nedeniyle sonuçlandırılamadı.',
    sms_sender_header = 'KENTIVA',
    sms_processing_template = '{belediye}: “{baslik}” başlıklı ihbarınız işleme alındı.',
    push_processing_title_template = 'İhbarınız işleme alındı',
    push_processing_body_template = '{baslik} için ekiplerimiz değerlendirmeye başladı.',
    sms_assigned_template = '{belediye}: “{baslik}” başlıklı ihbarınız saha ekibine atandı.',
    push_assigned_title_template = 'Ekip görevlendirildi',
    push_assigned_body_template = '{baslik} için ilgili saha ekibi görevlendirildi.',
    push_resolved_title_template = 'İhbarınız çözüldü',
    push_resolved_body_template = '{baslik} için çalışma tamamlandı. Geri bildiriminiz bizim için değerlidir.',
    widget_city_slug = 'amasya',
    widget_district_slug = 'gumushacikoy',
    workflow_mode = 'DEPARTMENTAL',
    mis_type = 'NONE',
    allow_municipality_rejection = TRUE,
    reputation_delta_report_created = 25,
    reputation_delta_report_resolved = 50,
    reputation_delta_report_rejected = -45,
    reputation_delta_inappropriate_media = -70,
    auto_suspension_threshold = 5,
    auto_suspension_days = 30,
    ai_media_moderation_enabled = TRUE,
    district_id = d.id
FROM turkey_districts d
WHERE d.member_id = '05-gumushacikoy'
  AND m.id = (
      SELECT candidate.id
      FROM municipalities candidate
      WHERE candidate.slug = 'gumushacikoy'
         OR candidate.district_id = d.id
      ORDER BY CASE WHEN candidate.slug = 'gumushacikoy' THEN 0 ELSE 1 END,
               candidate.created_at,
               candidate.id
      LIMIT 1
  );

-- ------------------------------------------------------------
-- Müdürlükler ve belediyeye özel ihbar kategorileri
-- ------------------------------------------------------------
INSERT INTO departments (
    id, name, slug, municipality_id, description, active, created_at, updated_at
)
SELECT seed.id, seed.name, seed.slug, m.id, seed.description, TRUE,
       CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP
FROM municipalities m
CROSS JOIN (VALUES
    ('05a00000-0001-4000-8000-000000000001', 'Fen İşleri Müdürlüğü', 'fen-isleri', 'Yol, kaldırım, altyapı ve aydınlatma çalışmaları'),
    ('05a00000-0001-4000-8000-000000000002', 'Temizlik İşleri Müdürlüğü', 'temizlik-isleri', 'Evsel atık, çevre temizliği ve geri dönüşüm hizmetleri'),
    ('05a00000-0001-4000-8000-000000000003', 'Park ve Bahçeler Müdürlüğü', 'park-ve-bahceler', 'Parklar, oyun alanları ve yeşil alanların bakımı'),
    ('05a00000-0001-4000-8000-000000000004', 'Su ve Kanalizasyon Birimi', 'su-ve-kanalizasyon', 'İçme suyu, yağmur suyu ve kanalizasyon koordinasyonu'),
    ('05a00000-0001-4000-8000-000000000005', 'Zabıta Müdürlüğü', 'zabita', 'Kent düzeni, işgal ve belediye denetimleri'),
    ('05a00000-0001-4000-8000-000000000006', 'Beyaz Masa', 'beyaz-masa', 'Vatandaş başvurularının ilk değerlendirme ve yönlendirme noktası')
) AS seed(id, name, slug, description)
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    municipality_id = EXCLUDED.municipality_id,
    description = EXCLUDED.description,
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO report_categories (
    id, name, description, icon_code, active,
    department_id, municipality_id, created_at, updated_at
)
SELECT seed.id, seed.name, seed.description, seed.icon_code, TRUE,
       seed.department_id, m.id,
       CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP
FROM municipalities m
CROSS JOIN (VALUES
    ('05a00000-0002-4000-8000-000000000001', 'Yol ve Kaldırım', 'Çukur, asfalt ve kaldırım hasarları', 'road_crack', '05a00000-0001-4000-8000-000000000001'),
    ('05a00000-0002-4000-8000-000000000002', 'Temizlik ve Atık', 'Çöp birikimi, konteyner ve usulsüz atık bildirimleri', 'trash', '05a00000-0001-4000-8000-000000000002'),
    ('05a00000-0002-4000-8000-000000000003', 'Park ve Yeşil Alan', 'Park, oyun grubu ve yeşil alan bakım talepleri', 'park', '05a00000-0001-4000-8000-000000000003'),
    ('05a00000-0002-4000-8000-000000000004', 'Su ve Kanalizasyon', 'Su kaçağı, rögar ve kanalizasyon sorunları', 'water', '05a00000-0001-4000-8000-000000000004'),
    ('05a00000-0002-4000-8000-000000000005', 'Sokak Aydınlatması', 'Yanmayan veya hasarlı sokak aydınlatmaları', 'streetlight', '05a00000-0001-4000-8000-000000000001'),
    ('05a00000-0002-4000-8000-000000000006', 'Zabıta Talebi', 'İşgal, gürültü ve kent düzeni bildirimleri', 'shield', '05a00000-0001-4000-8000-000000000005'),
    ('05a00000-0002-4000-8000-000000000007', 'Diğer', 'Diğer belediye hizmet talepleri', 'other', '05a00000-0001-4000-8000-000000000006')
) AS seed(id, name, description, icon_code, department_id)
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_code = EXCLUDED.icon_code,
    active = TRUE,
    department_id = EXCLUDED.department_id,
    municipality_id = EXCLUDED.municipality_id,
    updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- Rol bazlı test hesapları
-- Ortak parola: KentivaDemo1! (BCrypt cost 12)
-- ------------------------------------------------------------
INSERT INTO app_users (
    id, email, password, first_name, last_name, phone_number, enabled,
    department_id, district, municipality_id, preferred_municipality_id,
    reputation_score, loyalty_points, fcm_token,
    kvkk_approved, kvkk_approved_at, kvkk_signature,
    suspended_until, suspension_reason,
    created_at, updated_at
)
SELECT seed.id, seed.email,
       '$2a$12$eGlkuDp0UcP7ujrtKPPUF.BdFTuUUYYNGD.K0YcLgp8KlO2K96742',
       seed.first_name, seed.last_name, seed.phone_number, TRUE,
       seed.department_id, 'Gümüşhacıköy', m.id, m.id,
       seed.reputation_score, seed.loyalty_points, NULL,
       TRUE, CURRENT_TIMESTAMP - INTERVAL '100 days',
       'dev-demo-consent:gümüşhacıköy:v1',
       NULL, NULL,
       CURRENT_TIMESTAMP - INTERVAL '100 days', CURRENT_TIMESTAMP
FROM municipalities m
CROSS JOIN (VALUES
    ('05a00000-0003-4000-8000-000000000001', 'gumushacikoy.admin@kentiva.app', 'Ayşe', 'Yılmaz', '05000000001', NULL, 100, 250),
    ('05a00000-0003-4000-8000-000000000002', 'gumushacikoy.beyazmasa@kentiva.app', 'Mehmet', 'Kaya', '05000000002', '05a00000-0001-4000-8000-000000000006', 100, 150),
    ('05a00000-0003-4000-8000-000000000003', 'gumushacikoy.mudur@kentiva.app', 'Elif', 'Demir', '05000000003', '05a00000-0001-4000-8000-000000000001', 100, 175),
    ('05a00000-0003-4000-8000-000000000004', 'gumushacikoy.saha@kentiva.app', 'Emre', 'Çelik', '05000000004', '05a00000-0001-4000-8000-000000000001', 100, 125),
    ('05a00000-0003-4000-8000-000000000005', 'gumushacikoy.vatandas@kentiva.app', 'Zeynep', 'Arslan', '05000000006', NULL, 225, 780),
    ('05a00000-0003-4000-8000-000000000006', 'gumushacikoy.vatandas2@kentiva.app', 'Can', 'Koç', '05000000007', NULL, 160, 430)
) AS seed(
    id, email, first_name, last_name, phone_number, department_id,
    reputation_score, loyalty_points
)
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    enabled = TRUE,
    department_id = EXCLUDED.department_id,
    district = EXCLUDED.district,
    municipality_id = EXCLUDED.municipality_id,
    preferred_municipality_id = EXCLUDED.preferred_municipality_id,
    reputation_score = EXCLUDED.reputation_score,
    loyalty_points = EXCLUDED.loyalty_points,
    fcm_token = NULL,
    kvkk_approved = TRUE,
    kvkk_approved_at = EXCLUDED.kvkk_approved_at,
    kvkk_signature = EXCLUDED.kvkk_signature,
    suspended_until = NULL,
    suspension_reason = NULL,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM (VALUES
    ('gumushacikoy.admin@kentiva.app', 'ROLE_ADMIN'),
    ('gumushacikoy.beyazmasa@kentiva.app', 'ROLE_WHITE_DESK'),
    ('gumushacikoy.mudur@kentiva.app', 'ROLE_DEPT_MANAGER'),
    ('gumushacikoy.saha@kentiva.app', 'ROLE_FIELD_OFFICER'),
    ('gumushacikoy.vatandas@kentiva.app', 'ROLE_CITIZEN'),
    ('gumushacikoy.vatandas2@kentiva.app', 'ROLE_CITIZEN')
) AS seed(email, role_name)
JOIN app_users u ON u.email = seed.email
JOIN roles r ON r.name = seed.role_name
ON CONFLICT DO NOTHING;

INSERT INTO user_notification_preferences (
    id, user_id,
    announcements_enabled, outages_enabled, blood_donations_enabled,
    lost_pets_enabled, surveys_enabled,
    created_at, updated_at
)
SELECT seed.id, u.id, TRUE, TRUE, TRUE, TRUE, TRUE,
       CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP
FROM (VALUES
    ('05a00000-000f-4000-8000-000000000001', 'gumushacikoy.vatandas@kentiva.app'),
    ('05a00000-000f-4000-8000-000000000002', 'gumushacikoy.vatandas2@kentiva.app')
) AS seed(id, email)
JOIN app_users u ON u.email = seed.email
ON CONFLICT (user_id) DO UPDATE SET
    announcements_enabled = TRUE,
    outages_enabled = TRUE,
    blood_donations_enabled = TRUE,
    lost_pets_enabled = TRUE,
    surveys_enabled = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- Mobil hızlı ihbar şablonları
-- ------------------------------------------------------------
INSERT INTO report_templates (
    id, municipality_id, template_key, title, description_template,
    category_id, icon_code, sort_order, active, created_at, updated_at
)
SELECT seed.id, m.id, seed.template_key, seed.title,
       seed.description_template, seed.category_id, seed.icon_code,
       seed.sort_order, TRUE,
       CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP
FROM municipalities m
CROSS JOIN (VALUES
    ('05a00000-000e-4000-8000-000000000001', 'gumushacikoy-yol-cukuru', 'Yol çukuru', 'Yolda araç ve yaya güvenliğini etkileyen bir çukur bulunuyor. Konumun kontrol edilerek onarılmasını rica ederim.', '05a00000-0002-4000-8000-000000000001', 'road_crack', 10),
    ('05a00000-000e-4000-8000-000000000002', 'gumushacikoy-cop-birikimi', 'Çöp birikimi', 'Bölgede çöp birikimi oluştu. Temizlik ekibinin yönlendirilmesini rica ederim.', '05a00000-0002-4000-8000-000000000002', 'trash', 20),
    ('05a00000-000e-4000-8000-000000000003', 'gumushacikoy-aydinlatma', 'Aydınlatma arızası', 'Sokak lambası yanmıyor. Gece güvenliği için kontrol edilmesini rica ederim.', '05a00000-0002-4000-8000-000000000005', 'streetlight', 30),
    ('05a00000-000e-4000-8000-000000000004', 'gumushacikoy-park-bakimi', 'Park bakım talebi', 'Park alanında bakım gerektiren bir bölüm bulunuyor. Ekiplerin incelemesini rica ederim.', '05a00000-0002-4000-8000-000000000003', 'park', 40)
) AS seed(
    id, template_key, title, description_template,
    category_id, icon_code, sort_order
)
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (id) DO UPDATE SET
    municipality_id = EXCLUDED.municipality_id,
    template_key = EXCLUDED.template_key,
    title = EXCLUDED.title,
    description_template = EXCLUDED.description_template,
    category_id = EXCLUDED.category_id,
    icon_code = EXCLUDED.icon_code,
    sort_order = EXCLUDED.sort_order,
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- İhbarlar: tüm yaşam döngüsü durumlarını kapsayan örnekler
-- ------------------------------------------------------------
INSERT INTO reports (
    id, title, description, location, report_status,
    category_id, reporter_id, assignee_id,
    district, municipality_id,
    ai_suggested_category, ai_priority, ai_summary, ai_sla_risk,
    ai_reply_draft, ai_duplicate_hint, duplicate_group_id,
    content_language,
    forwarded_department_id, forwarded_at, forwarded_by_id,
    kvkk_approved, kvkk_approved_at, kvkk_signature,
    tracking_number, sla_breached, processed_at,
    hidden_from_municipality, deleted,
    created_at, updated_at
)
SELECT
    seed.id, seed.title, seed.description,
    ST_SetSRID(ST_MakePoint(seed.lng, seed.lat), 4326),
    seed.report_status, seed.category_id,
    reporter.id, assignee.id,
    'Gümüşhacıköy', m.id,
    seed.ai_category, seed.ai_priority, seed.ai_summary, seed.ai_sla_risk,
    seed.ai_reply_draft, seed.ai_duplicate_hint, seed.duplicate_group_id,
    'tr',
    seed.forwarded_department_id,
    CASE WHEN seed.forwarded_hours_ago IS NULL THEN NULL
         ELSE CURRENT_TIMESTAMP - seed.forwarded_hours_ago * INTERVAL '1 hour' END,
    forwarder.id,
    TRUE,
    CURRENT_TIMESTAMP - seed.created_hours_ago * INTERVAL '1 hour',
    'dev-demo-consent:' || seed.tracking_number,
    seed.tracking_number, seed.sla_breached,
    CASE WHEN seed.processed_hours_ago IS NULL THEN NULL
         ELSE CURRENT_TIMESTAMP - seed.processed_hours_ago * INTERVAL '1 hour' END,
    FALSE, FALSE,
    CURRENT_TIMESTAMP - seed.created_hours_ago * INTERVAL '1 hour',
    CURRENT_TIMESTAMP - seed.updated_hours_ago * INTERVAL '1 hour'
FROM municipalities m
CROSS JOIN (VALUES
    (
        '05a00000-0004-4000-8000-000000000001',
        'Hacıyahya Mahallesi’nde yol çukuru',
        'Okul güzergâhındaki çukur araçların ani manevra yapmasına neden oluyor. Güvenli geçiş için onarım talep ediyorum.',
        35.2138::double precision, 40.8735::double precision,
        'PENDING', '05a00000-0002-4000-8000-000000000001',
        'gumushacikoy.vatandas@kentiva.app', NULL,
        'Yol ve Kaldırım', 'HIGH',
        'Okul güzergâhında güvenliği etkileyen yol çukuru.', 'MEDIUM',
        'Başvurunuz Fen İşleri Müdürlüğümüzce değerlendirmeye alınacaktır.',
        NULL, NULL, NULL, NULL, NULL,
        'GMH-2026-0001', FALSE, NULL, 2, 2
    ),
    (
        '05a00000-0004-4000-8000-000000000002',
        'Cumara Mahallesi’nde dolu çöp konteyneri',
        'Konteyner iki gündür dolu ve çevresinde atık birikiyor. Temizlik ekibinin yönlendirilmesini rica ederim.',
        35.2172::double precision, 40.8717::double precision,
        'FORWARDED', '05a00000-0002-4000-8000-000000000002',
        'gumushacikoy.vatandas2@kentiva.app', NULL,
        'Temizlik ve Atık', 'MEDIUM',
        'Dolu konteyner nedeniyle çevresel temizlik talebi.', 'LOW',
        'Başvurunuz Temizlik İşleri Müdürlüğüne yönlendirildi.',
        NULL, NULL, '05a00000-0001-4000-8000-000000000002', 20,
        'gumushacikoy.beyazmasa@kentiva.app',
        'GMH-2026-0002', FALSE, NULL, 26, 20
    ),
    (
        '05a00000-0004-4000-8000-000000000003',
        'Artıkabat Mahallesi kaldırım hasarı',
        'Sağlık ocağına giden kaldırımda kırık taşlar bulunuyor. Bebek arabası ve tekerlekli sandalye geçişi zorlaşıyor.',
        35.2089::double precision, 40.8758::double precision,
        'PROCESSING', '05a00000-0002-4000-8000-000000000001',
        'gumushacikoy.vatandas@kentiva.app', 'gumushacikoy.saha@kentiva.app',
        'Yol ve Kaldırım', 'HIGH',
        'Erişilebilirliği etkileyen kaldırım hasarı.', 'HIGH',
        'Fen İşleri saha ekibimiz onarım için görevlendirildi.',
        NULL, NULL, '05a00000-0001-4000-8000-000000000001', 60,
        'gumushacikoy.beyazmasa@kentiva.app',
        'GMH-2026-0003', FALSE, 48, 72, 44
    ),
    (
        '05a00000-0004-4000-8000-000000000004',
        'Pazar yolu aydınlatma arızası',
        'Pazar yerine çıkan yoldaki iki sokak lambası yanmıyor. Akşam saatlerinde görüş azalıyor.',
        35.2194::double precision, 40.8699::double precision,
        'RESOLVED', '05a00000-0002-4000-8000-000000000005',
        'gumushacikoy.vatandas2@kentiva.app', 'gumushacikoy.saha@kentiva.app',
        'Sokak Aydınlatması', 'MEDIUM',
        'Pazar yolu üzerindeki aydınlatma arızası.', 'MEDIUM',
        'Arızalı bağlantılar yenilenerek aydınlatmalar devreye alındı.',
        NULL, NULL, '05a00000-0001-4000-8000-000000000001', 156,
        'gumushacikoy.beyazmasa@kentiva.app',
        'GMH-2026-0004', FALSE, 144, 192, 120
    ),
    (
        '05a00000-0004-4000-8000-000000000005',
        'Aynı konum için yinelenen genel başvuru',
        'Daha önce iletilen yol bakım talebinin tekrar kontrol edilmesini istiyorum.',
        35.2139::double precision, 40.8736::double precision,
        'REJECTED', '05a00000-0002-4000-8000-000000000007',
        'gumushacikoy.vatandas2@kentiva.app', NULL,
        'Diğer', 'LOW',
        'Daha önce açılan yol bakım kaydıyla aynı konum ve konu.', 'LOW',
        'Başvurunuz mevcut kayıtla ilişkilendirildi; süreci GMH-2026-0001 üzerinden takip edebilirsiniz.',
        'GMH-2026-0001 ile aynı konumda benzer içerik.',
        '05a00000-0011-4000-8000-000000000001', NULL, NULL,
        'gumushacikoy.beyazmasa@kentiva.app',
        'GMH-2026-0005', FALSE, NULL, 96, 88
    ),
    (
        '05a00000-0004-4000-8000-000000000006',
        'İlçe sınırı dışındaki su arızası bildirimi',
        'Gümüşhacıköy ilçe sınırları dışında görülen su sızıntısı için yönlendirme talep ediyorum.',
        35.1460::double precision, 40.9180::double precision,
        'OUT_OF_JURISDICTION', '05a00000-0002-4000-8000-000000000004',
        'gumushacikoy.vatandas@kentiva.app', NULL,
        'Su ve Kanalizasyon', 'MEDIUM',
        'Koordinat belediye hizmet alanının dışında.', 'LOW',
        'Konum belediyemiz hizmet sınırları dışında olduğu için başvurunuz ilgili kuruma yönlendirilmelidir.',
        NULL, NULL, NULL, NULL,
        'gumushacikoy.beyazmasa@kentiva.app',
        'GMH-2026-0006', FALSE, NULL, 120, 112
    )
) AS seed(
    id, title, description, lng, lat,
    report_status, category_id, reporter_email, assignee_email,
    ai_category, ai_priority, ai_summary, ai_sla_risk,
    ai_reply_draft, ai_duplicate_hint, duplicate_group_id,
    forwarded_department_id, forwarded_hours_ago, forwarder_email,
    tracking_number, sla_breached, processed_hours_ago,
    created_hours_ago, updated_hours_ago
)
JOIN app_users reporter ON reporter.email = seed.reporter_email
LEFT JOIN app_users assignee ON assignee.email = seed.assignee_email
LEFT JOIN app_users forwarder ON forwarder.email = seed.forwarder_email
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    location = EXCLUDED.location,
    report_status = EXCLUDED.report_status,
    category_id = EXCLUDED.category_id,
    reporter_id = EXCLUDED.reporter_id,
    assignee_id = EXCLUDED.assignee_id,
    district = EXCLUDED.district,
    municipality_id = EXCLUDED.municipality_id,
    ai_suggested_category = EXCLUDED.ai_suggested_category,
    ai_priority = EXCLUDED.ai_priority,
    ai_summary = EXCLUDED.ai_summary,
    ai_sla_risk = EXCLUDED.ai_sla_risk,
    ai_reply_draft = EXCLUDED.ai_reply_draft,
    ai_duplicate_hint = EXCLUDED.ai_duplicate_hint,
    duplicate_group_id = EXCLUDED.duplicate_group_id,
    content_language = EXCLUDED.content_language,
    forwarded_department_id = EXCLUDED.forwarded_department_id,
    forwarded_at = EXCLUDED.forwarded_at,
    forwarded_by_id = EXCLUDED.forwarded_by_id,
    kvkk_approved = TRUE,
    kvkk_approved_at = EXCLUDED.kvkk_approved_at,
    kvkk_signature = EXCLUDED.kvkk_signature,
    tracking_number = EXCLUDED.tracking_number,
    sla_breached = EXCLUDED.sla_breached,
    processed_at = EXCLUDED.processed_at,
    hidden_from_municipality = FALSE,
    deleted = FALSE,
    updated_at = EXCLUDED.updated_at;

-- Durum geçmişleri, kullanıcıların panelde tüm akışları inceleyebilmesi için
-- başlangıç dahil her önemli geçişi gösterir.
INSERT INTO report_history (
    id, report_id, old_status, new_status, changed_by_id,
    note, created_at, updated_at
)
SELECT seed.id, seed.report_id, seed.old_status, seed.new_status,
       actor.id, seed.note,
       CURRENT_TIMESTAMP - seed.hours_ago * INTERVAL '1 hour',
       CURRENT_TIMESTAMP - seed.hours_ago * INTERVAL '1 hour'
FROM (VALUES
    ('05a00000-0005-4000-8000-000000000001', '05a00000-0004-4000-8000-000000000001', NULL, 'PENDING', 'gumushacikoy.vatandas@kentiva.app', 'İhbar mobil uygulamadan alındı.', 2),
    ('05a00000-0005-4000-8000-000000000002', '05a00000-0004-4000-8000-000000000002', NULL, 'PENDING', 'gumushacikoy.vatandas2@kentiva.app', 'İhbar mobil uygulamadan alındı.', 26),
    ('05a00000-0005-4000-8000-000000000003', '05a00000-0004-4000-8000-000000000002', 'PENDING', 'FORWARDED', 'gumushacikoy.beyazmasa@kentiva.app', 'Temizlik İşleri Müdürlüğüne yönlendirildi.', 20),
    ('05a00000-0005-4000-8000-000000000004', '05a00000-0004-4000-8000-000000000003', NULL, 'PENDING', 'gumushacikoy.vatandas@kentiva.app', 'İhbar mobil uygulamadan alındı.', 72),
    ('05a00000-0005-4000-8000-000000000005', '05a00000-0004-4000-8000-000000000003', 'PENDING', 'FORWARDED', 'gumushacikoy.beyazmasa@kentiva.app', 'Fen İşleri Müdürlüğüne yönlendirildi.', 60),
    ('05a00000-0005-4000-8000-000000000006', '05a00000-0004-4000-8000-000000000003', 'FORWARDED', 'PROCESSING', 'gumushacikoy.mudur@kentiva.app', 'Saha görevlisi Emre Çelik’e atandı.', 48),
    ('05a00000-0005-4000-8000-000000000007', '05a00000-0004-4000-8000-000000000004', NULL, 'PENDING', 'gumushacikoy.vatandas2@kentiva.app', 'İhbar mobil uygulamadan alındı.', 192),
    ('05a00000-0005-4000-8000-000000000008', '05a00000-0004-4000-8000-000000000004', 'PENDING', 'FORWARDED', 'gumushacikoy.beyazmasa@kentiva.app', 'Fen İşleri Müdürlüğüne yönlendirildi.', 156),
    ('05a00000-0005-4000-8000-000000000009', '05a00000-0004-4000-8000-000000000004', 'FORWARDED', 'PROCESSING', 'gumushacikoy.mudur@kentiva.app', 'Aydınlatma kontrolü için saha ekibi atandı.', 144),
    ('05a00000-0005-4000-8000-000000000010', '05a00000-0004-4000-8000-000000000004', 'PROCESSING', 'RESOLVED', 'gumushacikoy.saha@kentiva.app', 'Arızalı bağlantılar yenilendi ve lambalar test edildi.', 120),
    ('05a00000-0005-4000-8000-000000000011', '05a00000-0004-4000-8000-000000000005', NULL, 'PENDING', 'gumushacikoy.vatandas2@kentiva.app', 'İhbar mobil uygulamadan alındı.', 96),
    ('05a00000-0005-4000-8000-000000000012', '05a00000-0004-4000-8000-000000000005', 'PENDING', 'REJECTED', 'gumushacikoy.beyazmasa@kentiva.app', 'Mevcut GMH-2026-0001 kaydıyla mükerrer olduğu doğrulandı.', 88),
    ('05a00000-0005-4000-8000-000000000013', '05a00000-0004-4000-8000-000000000006', NULL, 'PENDING', 'gumushacikoy.vatandas@kentiva.app', 'İhbar mobil uygulamadan alındı.', 120),
    ('05a00000-0005-4000-8000-000000000014', '05a00000-0004-4000-8000-000000000006', 'PENDING', 'OUT_OF_JURISDICTION', 'gumushacikoy.beyazmasa@kentiva.app', 'Koordinatın belediye hizmet alanı dışında olduğu doğrulandı.', 112)
) AS seed(id, report_id, old_status, new_status, actor_email, note, hours_ago)
JOIN app_users actor ON actor.email = seed.actor_email
ON CONFLICT (id) DO UPDATE SET
    report_id = EXCLUDED.report_id,
    old_status = EXCLUDED.old_status,
    new_status = EXCLUDED.new_status,
    changed_by_id = EXCLUDED.changed_by_id,
    note = EXCLUDED.note,
    updated_at = EXCLUDED.updated_at;

INSERT INTO report_feedbacks (
    id, report_id, rating, comment, created_at, updated_at
) VALUES (
    '05a00000-000d-4000-8000-000000000001',
    '05a00000-0004-4000-8000-000000000004',
    5,
    'Bildirimler düzenliydi ve aydınlatma sorunu kısa sürede çözüldü. Teşekkür ederim.',
    CURRENT_TIMESTAMP - INTERVAL '116 hours',
    CURRENT_TIMESTAMP - INTERVAL '116 hours'
)
ON CONFLICT (report_id) DO UPDATE SET
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    updated_at = EXCLUDED.updated_at;

-- ------------------------------------------------------------
-- İhbar fotoğrafları (demo görseller uploads/demo-media altında)
-- ------------------------------------------------------------
INSERT INTO report_media (
    id, image_url, public_id, report_id, resolved_image, created_at, updated_at
) VALUES
    -- Yol çukuru ihbarı (PENDING)
    ('05a00000-0012-4000-8000-000000000001', 'demo-media/pothole.png', NULL, '05a00000-0004-4000-8000-000000000001', FALSE, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    -- Dolu çöp konteyneri (FORWARDED)
    ('05a00000-0012-4000-8000-000000000002', 'demo-media/trash.png', NULL, '05a00000-0004-4000-8000-000000000002', FALSE, CURRENT_TIMESTAMP - INTERVAL '26 hours', CURRENT_TIMESTAMP - INTERVAL '26 hours'),
    -- Kaldırım hasarı (PROCESSING)
    ('05a00000-0012-4000-8000-000000000003', 'demo-media/sidewalk.png', NULL, '05a00000-0004-4000-8000-000000000003', FALSE, CURRENT_TIMESTAMP - INTERVAL '72 hours', CURRENT_TIMESTAMP - INTERVAL '72 hours'),
    -- Aydınlatma arızası (RESOLVED)
    ('05a00000-0012-4000-8000-000000000004', 'demo-media/streetlight.png', NULL, '05a00000-0004-4000-8000-000000000004', FALSE, CURRENT_TIMESTAMP - INTERVAL '192 hours', CURRENT_TIMESTAMP - INTERVAL '192 hours')
ON CONFLICT (id) DO UPDATE SET
    image_url = EXCLUDED.image_url,
    report_id = EXCLUDED.report_id,
    resolved_image = EXCLUDED.resolved_image,
    updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- Duyuru, anket, etkinlik ve planlı kesinti örnekleri
-- ------------------------------------------------------------
INSERT INTO municipality_announcements (
    id, municipality_id, title, content, image_url,
    starts_at, ends_at, active, deleted, created_at, updated_at
)
SELECT seed.id, m.id, seed.title, seed.content, seed.image_url,
       CURRENT_TIMESTAMP - seed.started_days_ago * INTERVAL '1 day',
       CASE WHEN seed.ends_in_days IS NULL THEN NULL
            ELSE CURRENT_TIMESTAMP + seed.ends_in_days * INTERVAL '1 day' END,
       TRUE, FALSE,
       CURRENT_TIMESTAMP - seed.started_days_ago * INTERVAL '1 day',
       CURRENT_TIMESTAMP
FROM municipalities m
CROSS JOIN (VALUES
    ('05a00000-0006-4000-8000-000000000001', 'Kentiva mobil ihbar hattı kullanıma açıldı', 'Yol, temizlik, park, su ve zabıta taleplerinizi konum ve fotoğraf ekleyerek iletebilir; başvurunuzun her adımını uygulamadan takip edebilirsiniz.', 'demo-media/announcement-kentiva.png', 5, 90),
    ('05a00000-0006-4000-8000-000000000002', 'Kapalı pazar yerinde bakım çalışması', 'Kapalı pazar yerinde zemin ve aydınlatma bakım çalışması yapılacaktır. Çalışma süresince yönlendirme levhalarını takip etmenizi rica ederiz.', 'demo-media/announcement-market.png', 1, 14),
    ('05a00000-0006-4000-8000-000000000003', 'Su tasarrufu için birlikte hareket edelim', 'Yaz döneminde su kaynaklarımızı korumak için gereksiz tüketimden kaçınalım; görünür kaçakları mobil ihbar hattından bildirelim.', 'demo-media/announcement-water.png', 3, NULL)
) AS seed(id, title, content, image_url, started_days_ago, ends_in_days)
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (id) DO UPDATE SET
    municipality_id = EXCLUDED.municipality_id,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    active = TRUE,
    deleted = FALSE,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO municipality_surveys (
    id, municipality_id, title, description,
    option1, option2, option3, option4,
    category, active, deleted, created_at, updated_at
)
SELECT seed.id, m.id, seed.title, seed.description,
       seed.option1, seed.option2, seed.option3, seed.option4,
       seed.category, TRUE, FALSE,
       CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP
FROM municipalities m
CROSS JOIN (VALUES
    ('05a00000-0007-4000-8000-000000000001', 'Yeni mahalle parkında önceliğiniz nedir?', 'Park yenileme programında ilk uygulanacak bölümü birlikte belirleyelim.', 'Çocuk oyun alanı', 'Yürüyüş parkuru', 'Spor alanı', 'Dinlenme ve gölgelik alan', 'Park ve Yeşil Alan'),
    ('05a00000-0007-4000-8000-000000000002', 'Dijital belediye hizmetlerini nasıl değerlendiriyorsunuz?', 'Mobil başvuru ve durum bildirimlerinin kullanım deneyimini değerlendirin.', 'Çok iyi', 'İyi', 'Geliştirilebilir', 'Kullanmadım', 'Dijital Hizmetler')
) AS seed(id, title, description, option1, option2, option3, option4, category)
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (id) DO UPDATE SET
    municipality_id = EXCLUDED.municipality_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    option1 = EXCLUDED.option1,
    option2 = EXCLUDED.option2,
    option3 = EXCLUDED.option3,
    option4 = EXCLUDED.option4,
    category = EXCLUDED.category,
    active = TRUE,
    deleted = FALSE,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO municipality_survey_votes (
    id, survey_id, user_id, selected_option, created_at
)
SELECT seed.id, seed.survey_id, u.id, seed.selected_option,
       CURRENT_TIMESTAMP - seed.days_ago * INTERVAL '1 day'
FROM (VALUES
    ('05a00000-0008-4000-8000-000000000001', '05a00000-0007-4000-8000-000000000001', 'gumushacikoy.vatandas@kentiva.app', 1, 3),
    ('05a00000-0008-4000-8000-000000000002', '05a00000-0007-4000-8000-000000000001', 'gumushacikoy.vatandas2@kentiva.app', 2, 2),
    ('05a00000-0008-4000-8000-000000000003', '05a00000-0007-4000-8000-000000000002', 'gumushacikoy.vatandas@kentiva.app', 1, 1)
) AS seed(id, survey_id, email, selected_option, days_ago)
JOIN app_users u ON u.email = seed.email
ON CONFLICT (survey_id, user_id) DO UPDATE SET
    selected_option = EXCLUDED.selected_option;

INSERT INTO municipality_events (
    id, municipality_id, title, venue, description,
    starts_at, ends_at, external_url, active, deleted,
    created_at, updated_at
)
SELECT seed.id, m.id, seed.title, seed.venue, seed.description,
       CURRENT_TIMESTAMP + seed.starts_in_days * INTERVAL '1 day',
       CURRENT_TIMESTAMP + seed.ends_in_days * INTERVAL '1 day',
       NULL, TRUE, FALSE,
       CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP
FROM municipalities m
CROSS JOIN (VALUES
    ('05a00000-0009-4000-8000-000000000001', 'Açık Hava Çocuk Şenliği', 'Şehir Parkı', 'Çocuk atölyeleri, geleneksel oyunlar ve sahne etkinlikleri.', 7, 7),
    ('05a00000-0009-4000-8000-000000000002', 'Yerel Üretici Buluşması', 'Kapalı Pazar Yeri', 'İlçemizdeki üreticiler ve vatandaşlar için tanıtım ve dayanışma buluşması.', 14, 14),
    ('05a00000-0009-4000-8000-000000000003', 'Kent Gönüllüleri Temizlik Etkinliği', 'Belediye Hizmet Binası Önü', 'Gönüllülerle birlikte belirlenen güzergâhta çevre temizliği ve farkındalık etkinliği.', 21, 21)
) AS seed(id, title, venue, description, starts_in_days, ends_in_days)
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (id) DO UPDATE SET
    municipality_id = EXCLUDED.municipality_id,
    title = EXCLUDED.title,
    venue = EXCLUDED.venue,
    description = EXCLUDED.description,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    external_url = NULL,
    active = TRUE,
    deleted = FALSE,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO municipality_outages (
    id, municipality_id, outage_type, title, district, message,
    starts_at, ends_at, active, deleted, created_at, updated_at
)
SELECT seed.id, m.id, seed.outage_type, seed.title,
       'Gümüşhacıköy', seed.message,
       CURRENT_TIMESTAMP + seed.starts_in_hours * INTERVAL '1 hour',
       CURRENT_TIMESTAMP + seed.ends_in_hours * INTERVAL '1 hour',
       TRUE, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM municipalities m
CROSS JOIN (VALUES
    ('05a00000-000a-4000-8000-000000000001', 'WATER', 'Planlı su kesintisi', 'Şebeke bakım çalışması nedeniyle Hacıyahya ve Cumara mahallelerinin bazı bölümlerinde kısa süreli su kesintisi uygulanacaktır.', 24, 30),
    ('05a00000-000a-4000-8000-000000000002', 'ELECTRICITY', 'Aydınlatma hattı bakım bilgisi', 'Pazar yolu çevresindeki belediye aydınlatma hattında planlı bakım yapılacaktır.', 48, 52)
) AS seed(id, outage_type, title, message, starts_in_hours, ends_in_hours)
WHERE m.slug = 'gumushacikoy'
ON CONFLICT (id) DO UPDATE SET
    municipality_id = EXCLUDED.municipality_id,
    outage_type = EXCLUDED.outage_type,
    title = EXCLUDED.title,
    district = EXCLUDED.district,
    message = EXCLUDED.message,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    active = TRUE,
    deleted = FALSE,
    updated_at = CURRENT_TIMESTAMP;

-- Kullanıcı bildirim merkezi ve dashboard sayıları boş görünmesin.
INSERT INTO notifications (
    id, title, body, type, read, report_id, user_id, created_at, updated_at
)
SELECT seed.id, seed.title, seed.body, seed.type, seed.is_read,
       seed.report_id, u.id,
       CURRENT_TIMESTAMP - seed.hours_ago * INTERVAL '1 hour',
       CURRENT_TIMESTAMP - seed.hours_ago * INTERVAL '1 hour'
FROM (VALUES
    ('05a00000-000b-4000-8000-000000000001', 'İhbarınız alındı', 'GMH-2026-0001 numaralı ihbarınız güvenle kaydedildi.', 'REPORT_STATUS_CHANGED', FALSE, '05a00000-0004-4000-8000-000000000001', 'gumushacikoy.vatandas@kentiva.app', 2),
    ('05a00000-000b-4000-8000-000000000002', 'Başvurunuz yönlendirildi', 'GMH-2026-0002 numaralı başvurunuz Temizlik İşleri Müdürlüğüne yönlendirildi.', 'REPORT_STATUS_CHANGED', FALSE, '05a00000-0004-4000-8000-000000000002', 'gumushacikoy.vatandas2@kentiva.app', 20),
    ('05a00000-000b-4000-8000-000000000003', 'Ekip görevlendirildi', 'GMH-2026-0003 numaralı ihbarınız için saha ekibi görevlendirildi.', 'REPORT_STATUS_CHANGED', FALSE, '05a00000-0004-4000-8000-000000000003', 'gumushacikoy.vatandas@kentiva.app', 48),
    ('05a00000-000b-4000-8000-000000000004', 'İhbarınız çözüldü', 'GMH-2026-0004 numaralı aydınlatma ihbarınız çözüldü.', 'REPORT_STATUS_CHANGED', TRUE, '05a00000-0004-4000-8000-000000000004', 'gumushacikoy.vatandas2@kentiva.app', 120),
    ('05a00000-000b-4000-8000-000000000005', 'Yeni saha görevi', 'Artıkabat Mahallesi kaldırım hasarı size atandı.', 'REPORT_ASSIGNED', FALSE, '05a00000-0004-4000-8000-000000000003', 'gumushacikoy.saha@kentiva.app', 48),
    ('05a00000-000b-4000-8000-000000000006', 'Gümüşhacıköy Kentiva’da', 'Belediye duyuruları, anketler ve ihbar takibi artık tek uygulamada.', 'SYSTEM_MESSAGE', TRUE, NULL, 'gumushacikoy.vatandas@kentiva.app', 168)
) AS seed(id, title, body, type, is_read, report_id, email, hours_ago)
JOIN app_users u ON u.email = seed.email
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    type = EXCLUDED.type,
    read = EXCLUDED.read,
    report_id = EXCLUDED.report_id,
    user_id = EXCLUDED.user_id,
    updated_at = EXCLUDED.updated_at;

-- Çözülen ihbarın puan hareketi de vatandaş profilindeki örnek veriyi destekler.
INSERT INTO reputation_audit_logs (
    id, user_id, previous_score, new_score, delta, reason, created_at
)
SELECT '05a00000-0010-4000-8000-000000000001', u.id,
       110, 160, 50, 'İhbar çözüldü: GMH-2026-0004',
       CURRENT_TIMESTAMP - INTERVAL '120 hours'
FROM app_users u
WHERE u.email = 'gumushacikoy.vatandas2@kentiva.app'
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    previous_score = EXCLUDED.previous_score,
    new_score = EXCLUDED.new_score,
    delta = EXCLUDED.delta,
    reason = EXCLUDED.reason;
