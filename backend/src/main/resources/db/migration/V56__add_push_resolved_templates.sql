-- Çözülen ihbar push bildirim şablonları
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS push_resolved_title_template VARCHAR(200);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS push_resolved_body_template TEXT;
