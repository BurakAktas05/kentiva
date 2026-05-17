UPDATE app_users
SET password = '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2',
    enabled = true,
    updated_at = NOW()
WHERE email = 'admin@kentiva.app';
