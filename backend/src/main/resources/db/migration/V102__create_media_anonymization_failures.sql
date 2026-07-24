-- KVKK Anonimleştirme Dead Letter Queue tablosu
-- Başarısız fotoğraf maskeleme işlemlerinin yeniden denenmesini sağlar.
CREATE TABLE IF NOT EXISTS media_anonymization_failures (
    id          VARCHAR(36) PRIMARY KEY,
    report_id   VARCHAR(36) NOT NULL,
    image_url   VARCHAR(1024) NOT NULL,
    error_message   TEXT,
    retry_count     INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP,
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMP,
    max_retries_exceeded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,

    CONSTRAINT fk_anon_fail_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anon_fail_unresolved ON media_anonymization_failures (resolved, max_retries_exceeded) WHERE resolved = false;
