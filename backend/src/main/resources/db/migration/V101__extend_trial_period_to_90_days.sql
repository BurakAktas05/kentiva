-- Pilot satis modeli: yeni donem 90 gun ucretsiz deneme.
-- Daha once 30 gun olarak olusturulmus TRIAL belediyelerin bitis tarihini 90 gune uzatir.
UPDATE municipalities
SET subscription_ends_at = created_at + INTERVAL '90 days'
WHERE subscription_plan = 'TRIAL'
  AND subscription_ends_at IS NOT NULL
  AND subscription_ends_at <= created_at + INTERVAL '31 days';
