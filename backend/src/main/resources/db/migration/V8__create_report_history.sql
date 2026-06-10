-- ============================================================
-- Rapor durum geçmiş kaydı (audit log)
-- ============================================================
CREATE TABLE report_history (
    id             VARCHAR(36) PRIMARY KEY,
    report_id      VARCHAR(36) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    old_status     VARCHAR(30),
    new_status     VARCHAR(30),
    changed_by_id  VARCHAR(36) REFERENCES app_users(id) ON DELETE SET NULL,
    note           TEXT,
    created_at     TIMESTAMP   NOT NULL,
    updated_at     TIMESTAMP
);

CREATE INDEX idx_report_history_report ON report_history(report_id);
