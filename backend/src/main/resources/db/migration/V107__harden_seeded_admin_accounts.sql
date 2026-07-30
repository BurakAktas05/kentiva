-- Disable predictable seeded admin identities and rotate their password hashes.
-- Real privileged account bootstrap must happen through the secured setup flow.

UPDATE app_users
SET enabled = false,
    password = crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
    updated_at = CURRENT_TIMESTAMP
WHERE email IN ('admin@ibb.gov.tr', 'admin@kentiva.app');
