ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS ai_suggested_category VARCHAR(200);
