-- KVKK kriptografik imza alanları
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS kvkk_signature VARCHAR(512);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS kvkk_signature VARCHAR(512);
