-- V59__add_user_suspension_and_out_of_jurisdiction_status.sql
-- Add suspension fields to app_users and update reports status check constraint

ALTER TABLE app_users ADD COLUMN suspended_until TIMESTAMP;
ALTER TABLE app_users ADD COLUMN suspension_reason VARCHAR(500);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_status;
ALTER TABLE reports ADD CONSTRAINT chk_reports_status 
  CHECK (report_status IN ('PENDING', 'FORWARDED', 'PROCESSING', 'RESOLVED', 'REJECTED', 'OUT_OF_JURISDICTION'));
