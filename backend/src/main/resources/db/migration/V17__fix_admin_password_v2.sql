-- DB zaten 16 göründüğü için V16 atlanmış olabilir; admin şifresini tekrar idempotent düzelt.
UPDATE app_users
SET password = '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS'
WHERE email = 'admin@ibb.gov.tr';
