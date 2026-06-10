CREATE TABLE export_schedules (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    municipality_id VARCHAR(255) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    created_by_id   VARCHAR(36) REFERENCES app_users(id) ON DELETE SET NULL,
    format          VARCHAR(10) NOT NULL DEFAULT 'EXCEL',
    frequency       VARCHAR(10) NOT NULL DEFAULT 'DAILY',
    hour_of_day     INT NOT NULL DEFAULT 6,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_export_schedules_municipality ON export_schedules(municipality_id);
CREATE INDEX idx_export_schedules_enabled ON export_schedules(enabled) WHERE enabled = TRUE;

CREATE TABLE export_runs (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    schedule_id     VARCHAR(36) REFERENCES export_schedules(id) ON DELETE SET NULL,
    municipality_id VARCHAR(255) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    storage_path    VARCHAR(512) NOT NULL,
    byte_size       BIGINT NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    error_message   TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_export_runs_municipality ON export_runs(municipality_id, created_at DESC);
