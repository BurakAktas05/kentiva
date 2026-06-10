-- V22 yalnızca reports tablosundaki IN_PROGRESS değerlerini düzeltti.
-- Eski kayıtlar report_history'de kaldığında timeline API'si 500 veriyordu.

UPDATE report_history
SET old_status = 'PROCESSING'
WHERE old_status = 'IN_PROGRESS';

UPDATE report_history
SET new_status = 'PROCESSING'
WHERE new_status = 'IN_PROGRESS';
