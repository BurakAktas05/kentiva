ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS content_language VARCHAR(5) NOT NULL DEFAULT 'tr';

COMMENT ON COLUMN reports.content_language IS 'Vatandaş rapor metninin dili: tr, en, ar';
