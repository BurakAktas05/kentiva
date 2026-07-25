-- V2'ye ertelenen vatandaş sosyal ilanları (kan / kayıp hayvan / eşya bağışı) kaldırıldı.
DROP TABLE IF EXISTS item_donation_ads CASCADE;
DROP TABLE IF EXISTS lost_pet_ads CASCADE;
DROP TABLE IF EXISTS blood_search_ads CASCADE;

ALTER TABLE user_notification_preferences
    DROP COLUMN IF EXISTS blood_donations_enabled,
    DROP COLUMN IF EXISTS lost_pets_enabled;
