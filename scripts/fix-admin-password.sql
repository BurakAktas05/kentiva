-- admin@ibb.gov.tr için şifreyi admin123 olacak şekilde düzelt (Flyway çalışmadıysa elle çalıştırın)
UPDATE app_users
SET password = '$2b$10$NACDoaUtprwogWQaETQjreC4xcrfUh7RhZ9ZcOlgzXOAVVEE1uNfS'
WHERE email = 'admin@ibb.gov.tr';
