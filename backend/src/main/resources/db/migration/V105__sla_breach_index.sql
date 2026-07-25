-- SLA hourly job filters on status + sla_breached; without an index this becomes a full scan.
CREATE INDEX IF NOT EXISTS idx_reports_sla_active
    ON reports (sla_breached, report_status)
    WHERE sla_breached = false;
