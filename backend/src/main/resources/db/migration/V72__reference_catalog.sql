-- V72__reference_catalog.sql
-- PostGIS tabanlı il/ilçe referans katalog yapısı

-- 1. turkey_provinces tablosu
CREATE TABLE IF NOT EXISTS turkey_provinces (
    plate_code  VARCHAR(10) PRIMARY KEY,
    name_tr     VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    boundaries  geometry(MultiPolygon, 4326)
);

-- 2. turkey_districts tablosu
CREATE TABLE IF NOT EXISTS turkey_districts (
    id              BIGSERIAL PRIMARY KEY,
    member_id       VARCHAR(150) UNIQUE NOT NULL,
    plate_code      VARCHAR(10) REFERENCES turkey_provinces(plate_code),
    district_slug   VARCHAR(100) NOT NULL,
    name_tr         VARCHAR(100) NOT NULL,
    boundaries      geometry(MultiPolygon, 4326),
    osm_id          BIGINT,
    centroid        geometry(Point, 4326),
    boundary_status VARCHAR(50) NOT NULL,
    UNIQUE (plate_code, district_slug)
);

-- 3. GIST Index'ler
CREATE INDEX IF NOT EXISTS idx_turkey_provinces_boundaries ON turkey_provinces USING GIST (boundaries);
CREATE INDEX IF NOT EXISTS idx_turkey_districts_boundaries ON turkey_districts USING GIST (boundaries);
CREATE INDEX IF NOT EXISTS idx_turkey_districts_centroid ON turkey_districts USING GIST (centroid);

-- 4. municipalities tablosuna district_id FK ekleme
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS district_id BIGINT REFERENCES turkey_districts(id);

-- 5. Onboarded tenant için UNIQUE district_id index'i
CREATE UNIQUE INDEX IF NOT EXISTS idx_municipalities_district_id_unique_onboarded 
ON municipalities(district_id) 
WHERE (onboarded = true);

-- 6. Eski V12 district_boundaries tablosunu temizle
DROP TABLE IF EXISTS district_boundaries CASCADE;

-- 7. 81 il verisini tohumla
INSERT INTO turkey_provinces (plate_code, name_tr, slug) VALUES
('01', 'Adana', 'adana'),
('02', 'Adıyaman', 'adiyaman'),
('03', 'Afyonkarahisar', 'afyonkarahisar'),
('04', 'Ağrı', 'agri'),
('05', 'Amasya', 'amasya'),
('06', 'Ankara', 'ankara'),
('07', 'Antalya', 'antalya'),
('08', 'Artvin', 'artvin'),
('09', 'Aydın', 'aydin'),
('10', 'Balıkesir', 'balikesir'),
('11', 'Bilecik', 'bilecik'),
('12', 'Bingöl', 'bingol'),
('13', 'Bitlis', 'bitlis'),
('14', 'Bolu', 'bolu'),
('15', 'Burdur', 'burdur'),
('16', 'Bursa', 'bursa'),
('17', 'Çanakkale', 'canakkale'),
('18', 'Çankırı', 'cankiri'),
('19', 'Çorum', 'corum'),
('20', 'Denizli', 'denizli'),
('21', 'Diyarbakır', 'diyarbakir'),
('22', 'Edirne', 'edirne'),
('23', 'Elazığ', 'elazig'),
('24', 'Erzincan', 'erzincan'),
('25', 'Erzurum', 'erzurum'),
('26', 'Eskişehir', 'eskisehir'),
('27', 'Gaziantep', 'gaziantep'),
('28', 'Giresun', 'giresun'),
('29', 'Gümüşhane', 'gumushane'),
('30', 'Hakkari', 'hakkari'),
('31', 'Hatay', 'hatay'),
('32', 'Isparta', 'isparta'),
('33', 'Mersin', 'mersin'),
('34', 'İstanbul', 'istanbul'),
('35', 'İzmir', 'izmir'),
('36', 'Kars', 'kars'),
('37', 'Kastamonu', 'kastamonu'),
('38', 'Kayseri', 'kayseri'),
('39', 'Kırklareli', 'kirklareli'),
('40', 'Kırşehir', 'kirsehir'),
('41', 'Kocaeli', 'kocaeli'),
('42', 'Konya', 'konya'),
('43', 'Kütahya', 'kutahya'),
('44', 'Malatya', 'malatya'),
('45', 'Manisa', 'manisa'),
('46', 'Kahramanmaraş', 'kahramanmaras'),
('47', 'Mardin', 'mardin'),
('48', 'Muğla', 'mugla'),
('49', 'Muş', 'mus'),
('50', 'Nevşehir', 'nevsehir'),
('51', 'Niğde', 'nigde'),
('52', 'Ordu', 'ordu'),
('53', 'Rize', 'rize'),
('54', 'Sakarya', 'sakarya'),
('55', 'Samsun', 'samsun'),
('56', 'Siirt', 'siirt'),
('57', 'Sinop', 'sinop'),
('58', 'Sivas', 'sivas'),
('59', 'Tekirdağ', 'tekirdag'),
('60', 'Tokat', 'tokat'),
('61', 'Trabzon', 'trabzon'),
('62', 'Tunceli', 'tunceli'),
('63', 'Şanlıurfa', 'sanliurfa'),
('64', 'Uşak', 'usak'),
('65', 'Van', 'van'),
('66', 'Yozgat', 'yozgat'),
('67', 'Zonguldak', 'zonguldak'),
('68', 'Aksaray', 'aksaray'),
('69', 'Bayburt', 'bayburt'),
('70', 'Karaman', 'karaman'),
('71', 'Kırıkkale', 'kirikkale'),
('72', 'Batman', 'batman'),
('73', 'Şırnak', 'sirnak'),
('74', 'Bartın', 'bartin'),
('75', 'Ardahan', 'ardahan'),
('76', 'Iğdır', 'igdir'),
('77', 'Yalova', 'yalova'),
('78', 'Karabük', 'karabuk'),
('79', 'Kilis', 'kilis'),
('80', 'Osmaniye', 'osmaniye'),
('81', 'Düzce', 'duzce')
ON CONFLICT (plate_code) DO NOTHING;

-- 8. Test/Dev ve Harita eşleşen bazı ilçeleri tohumla
INSERT INTO turkey_districts (member_id, plate_code, district_slug, name_tr, boundary_status) VALUES
('34-basaksehir', '34', 'basaksehir', 'Başakşehir', 'PENDING'),
('34-kadikoy', '34', 'kadikoy', 'Kadıköy', 'PENDING'),
('34-besiktas', '34', 'besiktas', 'Beşiktaş', 'PENDING'),
('34-uskudar', '34', 'uskudar', 'Üsküdar', 'PENDING'),
('34-fatih', '34', 'fatih', 'Fatih', 'PENDING'),
('34-beyoglu', '34', 'beyoglu', 'Beyoğlu', 'PENDING'),
('34-sisli', '34', 'sisli', 'Şişli', 'PENDING'),
('34-bakirkoy', '34', 'bakirkoy', 'Bakırköy', 'PENDING'),
('34-bahcelievler', '34', 'bahcelievler', 'Bahçelievler', 'PENDING'),
('34-kartal', '34', 'kartal', 'Kartal', 'PENDING'),
('34-maltepe', '34', 'maltepe', 'Maltepe', 'PENDING'),
('34-pendik', '34', 'pendik', 'Pendik', 'PENDING'),
('34-umraniye', '34', 'umraniye', 'Ümraniye', 'PENDING'),
('34-atasehir', '34', 'atasehir', 'Ataşehir', 'PENDING'),
('34-sariyer', '34', 'sariyer', 'Sarıyer', 'PENDING'),
('34-kagithane', '34', 'kagithane', 'Kağıthane', 'PENDING'),
('34-adalar', '34', 'adalar', 'Adalar', 'PENDING'),
('34-arnavutkoy', '34', 'arnavutkoy', 'Arnavutköy', 'PENDING'),
('34-avcilar', '34', 'avcilar', 'Avcılar', 'PENDING'),
('34-bagcilar', '34', 'bagcilar', 'Bağcılar', 'PENDING'),
('34-bayrampasa', '34', 'bayrampasa', 'Bayrampaşa', 'PENDING'),
('34-beykoz', '34', 'beykoz', 'Beykoz', 'PENDING'),
('34-beylikduzu', '34', 'beylikduzu', 'Beylikdüzü', 'PENDING'),
('34-buyukcekmece', '34', 'buyukcekmece', 'Büyükçekmece', 'PENDING'),
('34-catalca', '34', 'catalca', 'Çatalca', 'PENDING'),
('34-cekmekoy', '34', 'cekmekoy', 'Çekmeköy', 'PENDING'),
('34-esenler', '34', 'esenler', 'Esenler', 'PENDING'),
('34-esenyurt', '34', 'esenyurt', 'Esenyurt', 'PENDING'),
('34-eyupsultan', '34', 'eyupsultan', 'Eyüpsultan', 'PENDING'),
('34-gaziosmanpasa', '34', 'gaziosmanpasa', 'Gaziosmanpaşa', 'PENDING'),
('34-gungoren', '34', 'gungoren', 'Güngören', 'PENDING'),
('34-kucukcekmece', '34', 'kucukcekmece', 'Küçükçekmece', 'PENDING'),
('34-sancaktepe', '34', 'sancaktepe', 'Sancaktepe', 'PENDING'),
('34-silivri', '34', 'silivri', 'Silivri', 'PENDING'),
('34-sultanbeyli', '34', 'sultanbeyli', 'Sultanbeyli', 'PENDING'),
('34-sultangazi', '34', 'sultangazi', 'Sultangazi', 'PENDING'),
('34-sile', '34', 'sile', 'Şile', 'PENDING'),
('34-tuzla', '34', 'tuzla', 'Tuzla', 'PENDING'),
('34-zeytinburnu', '34', 'zeytinburnu', 'Zeytinburnu', 'PENDING'),
('06-kecioren', '06', 'kecioren', 'Keçiören', 'PENDING'),
('06-cankaya', '06', 'cankaya', 'Çankaya', 'PENDING'),
('06-etimesgut', '06', 'etimesgut', 'Etimesgut', 'PENDING'),
('06-mamak', '06', 'mamak', 'Mamak', 'PENDING'),
('06-sincan', '06', 'sincan', 'Sincan', 'PENDING'),
('06-yenimahalle', '06', 'yenimahalle', 'Yenimahalle', 'PENDING'),
('06-altindag', '06', 'altindag', 'Altındağ', 'PENDING'),
('06-pursaklar', '06', 'pursaklar', 'Pursaklar', 'PENDING'),
('78-safranbolu', '78', 'safranbolu', 'Safranbolu', 'PENDING'),
('35-konak', '35', 'konak', 'Konak', 'PENDING'),
('35-karsiyaka', '35', 'karsiyaka', 'Karşıyaka', 'PENDING'),
('35-bornova', '35', 'bornova', 'Bornova', 'PENDING'),
('35-buca', '35', 'buca', 'Buca', 'PENDING'),
('35-cigli', '35', 'cigli', 'Çiğli', 'PENDING'),
('35-gaziemir', '35', 'gaziemir', 'Gaziemir', 'PENDING'),
('35-balcova', '35', 'balcova', 'Balçova', 'PENDING'),
('35-narlidere', '35', 'narlidere', 'Narlıdere', 'PENDING')
ON CONFLICT (member_id) DO NOTHING;

-- 9. Mevcut belediyeleri yeni kataloga bağla (widget_district_slug üzerinden eşleştir)
UPDATE municipalities m
SET district_id = d.id
FROM turkey_districts d
WHERE d.district_slug = m.widget_district_slug;

-- 10. Eski municipalities boundaries kolonunu kaldır
ALTER TABLE municipalities DROP COLUMN IF EXISTS boundaries;
