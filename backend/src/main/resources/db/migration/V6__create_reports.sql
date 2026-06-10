-- ============================================================
-- Raporlar tablosu
-- ============================================================
CREATE TABLE reports (
    id            VARCHAR(36)  PRIMARY KEY,
    title         VARCHAR(150) NOT NULL,
    description   TEXT         NOT NULL,
    -- PostGIS coğrafi nokta: WGS84 (SRID 4326)
    location      geometry(Point, 4326) NOT NULL,
    report_status VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
    category_id   VARCHAR(36)  NOT NULL REFERENCES report_categories(id),
    reporter_id   VARCHAR(36)  NOT NULL REFERENCES app_users(id),
    assignee_id   VARCHAR(36)           REFERENCES app_users(id),
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP
);

-- Spatial index: yakın rapor sorgularını hızlandırır
CREATE INDEX idx_reports_location ON reports USING GIST(location);

-- Durum ve tarih indexleri: filtreleme için
CREATE INDEX idx_reports_status     ON reports(report_status);
CREATE INDEX idx_reports_reporter   ON reports(reporter_id);
CREATE INDEX idx_reports_assignee   ON reports(assignee_id);
CREATE INDEX idx_reports_category   ON reports(category_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
