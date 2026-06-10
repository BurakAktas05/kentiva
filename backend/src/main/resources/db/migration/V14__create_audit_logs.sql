-- ============================================================
-- V14: Denetim Günlüğü (Audit Log) Tablosu
-- Belediye denetim kurulu gereksinimleri için zorunlu.
-- Tüm kritik işlemler bu tabloya kaydedilir.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id              VARCHAR(36) PRIMARY KEY,
    username        VARCHAR(150) NOT NULL,
    user_id         VARCHAR(36),
    action          VARCHAR(80) NOT NULL,
    description     TEXT,
    method_name     VARCHAR(200),
    result_summary  TEXT,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Sık sorgulanan alanlar için indeksler
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs (username);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);
