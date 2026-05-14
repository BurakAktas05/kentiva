-- 1. Create municipalities table
CREATE TABLE IF NOT EXISTS municipalities (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    parent_id VARCHAR(255) REFERENCES municipalities(id),
    center_lat DOUBLE PRECISION NOT NULL DEFAULT 41.0082,
    center_lng DOUBLE PRECISION NOT NULL DEFAULT 28.9784,
    default_zoom INTEGER NOT NULL DEFAULT 12,
    boundaries geometry(Polygon, 4326)
);

-- 2. Insert Metropolitan Municipality
INSERT INTO municipalities (id, name, type, center_lat, center_lng, default_zoom) 
VALUES (gen_random_uuid()::varchar, 'İstanbul Büyükşehir Belediyesi', 'METROPOLITAN', 41.0082, 28.9784, 11);

-- 3. Migrate from district_boundaries to municipalities
INSERT INTO municipalities (id, name, type, parent_id, center_lat, center_lng, default_zoom, boundaries)
SELECT 
    gen_random_uuid()::varchar,
    name, 
    'DISTRICT', 
    (SELECT id FROM municipalities WHERE name = 'İstanbul Büyükşehir Belediyesi'),
    ST_Y(ST_Centroid(boundary)), 
    ST_X(ST_Centroid(boundary)), 
    14, 
    boundary
FROM district_boundaries;

-- 4. Add municipality_id to other tables
ALTER TABLE app_users ADD COLUMN municipality_id VARCHAR(255) REFERENCES municipalities(id);
ALTER TABLE departments ADD COLUMN municipality_id VARCHAR(255) REFERENCES municipalities(id);
ALTER TABLE reports ADD COLUMN municipality_id VARCHAR(255) REFERENCES municipalities(id);

-- 5. Map existing data based on the string 'district' column
UPDATE app_users 
SET municipality_id = m.id 
FROM municipalities m 
WHERE app_users.district = m.name;

UPDATE reports 
SET municipality_id = m.id 
FROM municipalities m 
WHERE reports.district = m.name;

-- 6. For departments, assign all to Istanbul Buyuksehir Belediyesi by default to avoid nulls if we want
UPDATE departments 
SET municipality_id = (SELECT id FROM municipalities WHERE name = 'İstanbul Büyükşehir Belediyesi');
