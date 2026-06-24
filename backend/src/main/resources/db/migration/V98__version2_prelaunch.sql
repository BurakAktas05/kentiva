-- V98__version2_prelaunch.sql
-- Pre-launch optimizations, indexes, and reputation score audit logging.

-- 1. Spatial indexing on municipalities boundary (boundaries)
CREATE INDEX IF NOT EXISTS idx_municipality_boundaries_geom ON municipalities USING GIST (boundaries);

-- 2. Multi-tenancy composite index on reports
CREATE INDEX IF NOT EXISTS idx_reports_muni_status ON reports (municipality_id, report_status);

-- 3. Reputation Audit Logs table
CREATE TABLE IF NOT EXISTS reputation_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES app_users(id),
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Indexes for fast lookup of reputation logs
CREATE INDEX IF NOT EXISTS idx_reputation_audit_logs_user ON reputation_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_audit_logs_created_at ON reputation_audit_logs (created_at DESC);
