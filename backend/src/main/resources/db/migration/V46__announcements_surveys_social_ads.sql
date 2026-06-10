-- V46__announcements_surveys_social_ads.sql
-- Uçtan Uca Kentiva İlave Özellikleri: Duyurular, Anketler, Sosyal İlanlar, Bildirim Tercihleri

-- 1. Belediye Duyuruları
CREATE TABLE IF NOT EXISTS municipality_announcements (
    id              VARCHAR(36) PRIMARY KEY,
    municipality_id VARCHAR(36) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    image_url       VARCHAR(500),
    starts_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    ends_at         TIMESTAMP,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Belediye Anketleri
CREATE TABLE IF NOT EXISTS municipality_surveys (
    id              VARCHAR(36) PRIMARY KEY,
    municipality_id VARCHAR(36) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    option1         VARCHAR(150) NOT NULL,
    option2         VARCHAR(150) NOT NULL,
    option3         VARCHAR(150),
    option4         VARCHAR(150),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Anket Katılım Kayıtları (Her kullanıcı bir ankete tek oy verebilir)
CREATE TABLE IF NOT EXISTS municipality_survey_votes (
    id              VARCHAR(36) PRIMARY KEY,
    survey_id       VARCHAR(36) NOT NULL REFERENCES municipality_surveys(id) ON DELETE CASCADE,
    user_id         VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    selected_option INT NOT NULL, -- 1, 2, 3 veya 4
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_survey_user UNIQUE (survey_id, user_id)
);

-- 4. Kan Bağışı İlanları (C2C)
CREATE TABLE IF NOT EXISTS blood_search_ads (
    id                VARCHAR(36) PRIMARY KEY,
    user_id           VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    blood_type        VARCHAR(10) NOT NULL,
    hospital_name     VARCHAR(200) NOT NULL,
    hospital_district VARCHAR(100) NOT NULL,
    patient_name      VARCHAR(100) NOT NULL,
    contact_phone     VARCHAR(30) NOT NULL,
    description       TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Kayıp Evcil Hayvan İlanları (C2C)
CREATE TABLE IF NOT EXISTS lost_pet_ads (
    id                 VARCHAR(36) PRIMARY KEY,
    user_id            VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    pet_name           VARCHAR(100) NOT NULL,
    pet_type           VARCHAR(50) NOT NULL, -- Kedi, Köpek vb.
    breed              VARCHAR(100),
    last_seen_district VARCHAR(100) NOT NULL,
    contact_phone      VARCHAR(30) NOT NULL,
    description        TEXT,
    media_url          VARCHAR(500),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Kullanıcı Bildirim Tercihleri
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id                      VARCHAR(36) PRIMARY KEY,
    user_id                 VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE UNIQUE,
    announcements_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    outages_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    blood_donations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    lost_pets_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    surveys_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_announcements_muni ON municipality_announcements(municipality_id);
CREATE INDEX IF NOT EXISTS idx_surveys_muni ON municipality_surveys(municipality_id);
CREATE INDEX IF NOT EXISTS idx_survey_votes_user ON municipality_survey_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_blood_ads_district ON blood_search_ads(hospital_district);
CREATE INDEX IF NOT EXISTS idx_lost_pet_district ON lost_pet_ads(last_seen_district);
