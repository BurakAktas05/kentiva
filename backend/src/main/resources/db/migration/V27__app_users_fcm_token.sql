-- Vatandaş mobil push (FCM) cihaz token'ı
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);
