ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS widget_city_slug VARCHAR(80);

ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS widget_district_slug VARCHAR(80);

COMMENT ON COLUMN municipalities.widget_city_slug IS 'Nöbetçi eczane API il slug (örn. istanbul)';
COMMENT ON COLUMN municipalities.widget_district_slug IS 'Nöbetçi eczane API ilçe slug (örn. kadikoy)';
