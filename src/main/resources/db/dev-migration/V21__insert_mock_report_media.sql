-- V21: Mock Report Media (yalnızca dev profili için)
INSERT INTO report_media (id, image_url, report_id, created_at, updated_at)
VALUES
('media-pothole-1', 'https://images.unsplash.com/photo-1599423300746-b62533397364?q=80&w=1000', 'mock-rep-1', NOW(), NOW()),
('media-lamp-1', 'https://images.unsplash.com/photo-1542640244-7e672d6cef21?q=80&w=1000', 'mock-rep-2', NOW(), NOW()),
('media-trash-1', 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=1000', 'mock-rep-3', NOW(), NOW()),
('media-sidewalk-1', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1000', 'mock-rep-4', NOW(), NOW()),
('media-bus-1', 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000', 'mock-rep-6', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
