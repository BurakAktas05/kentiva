-- ============================================================
-- Bildirimler tablosu
-- ============================================================
CREATE TABLE notifications (
    id         VARCHAR(36)   PRIMARY KEY,
    title      VARCHAR(200)  NOT NULL,
    body       TEXT          NOT NULL,
    type       VARCHAR(50)   NOT NULL,
    read       BOOLEAN       NOT NULL DEFAULT FALSE,
    report_id  VARCHAR(36),            -- İlişkili rapor (opsiyonel)
    user_id    VARCHAR(36)   NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP     NOT NULL,
    updated_at TIMESTAMP
);

CREATE INDEX idx_notifications_user    ON notifications(user_id);
CREATE INDEX idx_notifications_unread  ON notifications(user_id, read) WHERE read = FALSE;
