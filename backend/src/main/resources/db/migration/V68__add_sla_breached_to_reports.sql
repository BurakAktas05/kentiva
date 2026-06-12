-- V68__add_sla_breached_to_reports.sql
-- Add sla_breached column to reports table

ALTER TABLE reports ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT FALSE;
