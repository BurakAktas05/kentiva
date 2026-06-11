CREATE TABLE IF NOT EXISTS system_feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    rating INT NOT NULL,
    content TEXT NOT NULL,
    sentiment VARCHAR(20),
    category VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_system_feedbacks_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
);
