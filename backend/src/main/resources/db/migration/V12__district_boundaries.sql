-- İlçe sınırları (yaklaşık dikdörtgen bölgeler — üretimde resmi İBB poligonları ile değiştirin)
CREATE TABLE IF NOT EXISTS district_boundaries (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    boundary    geometry(Polygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_district_boundaries_boundary ON district_boundaries USING GIST (boundary);

-- minLon, minLat, maxLon, maxLat — WGS84 (EPSG:4326)
INSERT INTO district_boundaries (name, boundary) VALUES
('Kadıköy', ST_SetSRID(ST_MakeEnvelope(29.018, 40.985, 29.085, 41.038, 4326), 4326)),
('Üsküdar', ST_SetSRID(ST_MakeEnvelope(29.045, 41.008, 29.095, 41.045, 4326), 4326)),
('Beşiktaş', ST_SetSRID(ST_MakeEnvelope(28.985, 41.035, 29.045, 41.085, 4326), 4326)),
('Şişli', ST_SetSRID(ST_MakeEnvelope(28.965, 41.045, 29.015, 41.085, 4326), 4326)),
('Fatih', ST_SetSRID(ST_MakeEnvelope(28.915, 40.995, 28.985, 41.035, 4326), 4326)),
('Beyoğlu', ST_SetSRID(ST_MakeEnvelope(28.965, 41.025, 29.045, 41.055, 4326), 4326)),
('Bakırköy', ST_SetSRID(ST_MakeEnvelope(28.815, 40.965, 28.895, 41.005, 4326), 4326)),
('Bahçelievler', ST_SetSRID(ST_MakeEnvelope(28.805, 41.000, 28.865, 41.035, 4326), 4326)),
('Kartal', ST_SetSRID(ST_MakeEnvelope(29.135, 40.875, 29.205, 40.925, 4326), 4326)),
('Maltepe', ST_SetSRID(ST_MakeEnvelope(29.115, 40.915, 29.185, 40.965, 4326), 4326)),
('Pendik', ST_SetSRID(ST_MakeEnvelope(29.215, 40.865, 29.325, 40.925, 4326), 4326)),
('Ümraniye', ST_SetSRID(ST_MakeEnvelope(29.085, 41.000, 29.165, 41.055, 4326), 4326)),
('Ataşehir', ST_SetSRID(ST_MakeEnvelope(29.075, 40.965, 29.135, 41.015, 4326), 4326)),
('Sarıyer', ST_SetSRID(ST_MakeEnvelope(28.985, 41.085, 29.085, 41.195, 4326), 4326)),
('Kağıthane', ST_SetSRID(ST_MakeEnvelope(28.965, 41.065, 29.025, 41.105, 4326), 4326))
ON CONFLICT (name) DO NOTHING;
