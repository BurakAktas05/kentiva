CREATE TABLE IF NOT EXISTS municipality_rewards (
    id              VARCHAR(36) PRIMARY KEY,
    municipality_id VARCHAR(36) NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    point_cost      INT NOT NULL,
    stock           INT NOT NULL DEFAULT 0,
    image_url       VARCHAR(500),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_redeemed_rewards (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    reward_id       VARCHAR(36) NOT NULL REFERENCES municipality_rewards(id) ON DELETE CASCADE,
    redemption_code VARCHAR(50) NOT NULL UNIQUE,
    status          VARCHAR(30) NOT NULL, -- 'REDEEMED', 'CLAIMED', 'CANCELLED'
    redeemed_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rewards_municipality ON municipality_rewards(municipality_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_redeemed_rewards(user_id);
