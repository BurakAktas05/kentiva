-- Tum test kullanicilarina dogru sifre hash'ini yaz
-- Sifre: Test1234!
-- Hash: $2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2  (bu admin123 icin!)
-- Sifre: admin123 kullanacagiz, tek sifre herkese

UPDATE app_users
SET password = '$2b$10$WrjhDXizBAfA6ND.hSEZM.nrqqrjiT5Zq4tLRZSJ6iubCrlFTUNn2'
WHERE email IN (
    'admin@kentiva.app',
    'admin@safranbolu.bel.tr',
    'vatandas@test.com',
    'saha@safranbolu.bel.tr'
);

SELECT email, left(password, 20) as hash_prefix, enabled FROM app_users
WHERE email IN ('admin@kentiva.app','admin@safranbolu.bel.tr','vatandas@test.com','saha@safranbolu.bel.tr');
