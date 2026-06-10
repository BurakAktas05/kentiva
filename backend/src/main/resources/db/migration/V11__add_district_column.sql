-- Raporlara ve kullanıcılara ilçe bazlı ayrıştırma için district kolonu eklenmesi
ALTER TABLE reports ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS district VARCHAR(100);
