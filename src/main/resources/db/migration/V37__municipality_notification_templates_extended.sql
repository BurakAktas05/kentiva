ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS sms_processing_template TEXT,
    ADD COLUMN IF NOT EXISTS push_processing_title_template VARCHAR(200),
    ADD COLUMN IF NOT EXISTS push_processing_body_template TEXT,
    ADD COLUMN IF NOT EXISTS sms_assigned_template TEXT,
    ADD COLUMN IF NOT EXISTS push_assigned_title_template VARCHAR(200),
    ADD COLUMN IF NOT EXISTS push_assigned_body_template TEXT;
