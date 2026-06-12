-- V70__add_processed_at_to_reports.sql
-- Add processed_at column to reports table for SLA tracking of processing stage

ALTER TABLE reports ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
