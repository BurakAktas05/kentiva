-- V96__seed_amasya_districts.sql
-- Amasya ve Gümüşhacıköy referans katalog ilçelerinin tohumlanması
INSERT INTO turkey_districts (member_id, plate_code, district_slug, name_tr, boundary_status) VALUES
('05-gumushacikoy', '05', 'gumushacikoy', 'Gümüşhacıköy', 'PENDING'),
('05-merzifon', '05', 'merzifon', 'Merzifon', 'PENDING'),
('05-suluova', '05', 'suluova', 'Suluova', 'PENDING'),
('05-tasova', '05', 'tasova', 'Taşova', 'PENDING'),
('05-amasya-merkez', '05', 'amasya-merkez', 'Amasya Merkez', 'PENDING')
ON CONFLICT (member_id) DO NOTHING;
