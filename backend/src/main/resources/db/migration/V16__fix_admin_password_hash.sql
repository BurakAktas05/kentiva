-- Önceki seed'teki admin bcrypt hash'i "admin123" ile eşleşmiyordu (giriş başarısızdı).
UPDATE app_users
SET password = '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS'
WHERE email = 'admin@ibb.gov.tr';
