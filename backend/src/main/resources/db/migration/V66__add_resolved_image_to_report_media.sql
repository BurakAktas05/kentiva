-- V66__add_resolved_image_to_report_media.sql
-- Add resolved_image column to report_media table to distinguish before/after photos

ALTER TABLE report_media ADD COLUMN IF NOT EXISTS resolved_image BOOLEAN NOT NULL DEFAULT FALSE;
