-- V62__dynamic_reputation_and_moderation_settings.sql
-- Add configuration columns for dynamic reputation and moderation settings to municipalities, and hidden report flag to reports.

ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS allow_municipality_rejection BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS reputation_delta_report_created INT NOT NULL DEFAULT 25;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS reputation_delta_report_resolved INT NOT NULL DEFAULT 50;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS reputation_delta_report_rejected INT NOT NULL DEFAULT -45;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS reputation_delta_inappropriate_media INT NOT NULL DEFAULT -70;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS auto_suspension_threshold INT NOT NULL DEFAULT 5;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS auto_suspension_days INT NOT NULL DEFAULT 30;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS ai_media_moderation_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS hidden_from_municipality BOOLEAN NOT NULL DEFAULT FALSE;
