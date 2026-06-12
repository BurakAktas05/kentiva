-- V67__add_tracking_number_to_reports.sql
-- Add tracking_number column to reports for citizen tracking and QR code lookup

ALTER TABLE reports ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(50) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_reports_tracking_number ON reports(tracking_number);
