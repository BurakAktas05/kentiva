-- ============================================================
-- JWT Refresh Token tablosu
-- ============================================================
CREATE TABLE refresh_tokens (
    id         VARCHAR(36)  PRIMARY KEY,
    token      TEXT         NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
    user_id    VARCHAR(36)  NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP    NOT NULL,
    updated_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;
