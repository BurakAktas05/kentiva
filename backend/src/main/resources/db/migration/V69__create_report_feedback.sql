-- V69__create_report_feedback.sql
-- Create report_feedbacks table for citizen satisfaction surveys

CREATE TABLE IF NOT EXISTS report_feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    report_id VARCHAR(36) NOT NULL UNIQUE REFERENCES reports(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(500),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
