-- ============================================================
-- Kullanıcılar tablosu
-- ============================================================
CREATE TABLE app_users (
    id            VARCHAR(36)  PRIMARY KEY,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    first_name    VARCHAR(80)  NOT NULL,
    last_name     VARCHAR(80)  NOT NULL,
    phone_number  VARCHAR(20),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    department_id VARCHAR(36)  REFERENCES departments(id) ON DELETE SET NULL,
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP
);

-- Index: email araması hızlandırma
CREATE INDEX idx_app_users_email ON app_users(email);

-- ============================================================
-- Kullanıcı → Rol ilişki tablosu
-- ============================================================
CREATE TABLE user_roles (
    user_id VARCHAR(36) NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role_id VARCHAR(36) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);
