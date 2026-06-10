-- Belediye bazlı vatandaş bildirim metinleri

ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS sms_resolved_template TEXT;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS push_rejected_title_template VARCHAR(200);
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS push_rejected_body_template TEXT;
-- NetGSM gönderici başlığı (max 11 karakter); boşsa global NETGSM_MSGHEADER kullanılır
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS sms_sender_header VARCHAR(11);
