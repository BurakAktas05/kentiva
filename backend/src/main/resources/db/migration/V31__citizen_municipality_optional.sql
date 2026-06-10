-- Vatandaşlar tek bir belediyeye bağlı değildir; municipality_id yalnızca personel tenant kapsamı içindir.
COMMENT ON COLUMN app_users.municipality_id IS 'Staff tenant scope; null for citizens (reports routed by GPS at submit time)';
