-- V65__create_webhook_delivery_logs.sql
-- Create webhook delivery logs table for retry mechanism

CREATE TABLE webhook_delivery_logs (
    id VARCHAR(36) PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    municipality_id VARCHAR(36) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    event VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    signature VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    status_code INTEGER,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP
);

CREATE INDEX idx_webhook_delivery_logs_status_next_attempt ON webhook_delivery_logs(status, next_attempt_at);
