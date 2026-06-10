-- AI öncelik/özet alanları (dev mock ve runtime için; önceden yalnızca ddl-auto ile ekleniyordu)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_priority VARCHAR(20);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_summary TEXT;
