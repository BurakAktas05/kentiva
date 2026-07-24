-- Local/demo database cleanup for capacity.js. Never run against production.
-- The safety assertion aborts if the selected citizen has REPORT_CREATED audit
-- records that do not correspond one-for-one with generated load reports.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';
LOCK TABLE reports, reputation_audit_logs, notifications
    IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE cleanup_gmh_load_reports ON COMMIT DROP AS
SELECT r.id
FROM reports r
JOIN municipalities m ON m.id = r.municipality_id
JOIN app_users u ON u.id = r.reporter_id
WHERE m.slug = 'gumushacikoy'
  AND u.email = 'gumushacikoy.vatandas@kentiva.app'
  AND r.title LIKE 'Yuk testi yol aydinlatma arizasi %';

DO $cleanup$
DECLARE
    v_report_count bigint;
    v_audit_count bigint;
BEGIN
    SELECT count(*) INTO v_report_count FROM cleanup_gmh_load_reports;
    SELECT count(*) INTO v_audit_count
    FROM reputation_audit_logs
    WHERE user_id = (
        SELECT id FROM app_users
        WHERE email = 'gumushacikoy.vatandas@kentiva.app'
    )
      AND reason = 'REPORT_CREATED';

    IF v_report_count <> v_audit_count THEN
        RAISE EXCEPTION
            'Cleanup aborted: load reports (%) and REPORT_CREATED audits (%) differ',
            v_report_count, v_audit_count;
    END IF;
END
$cleanup$;

DELETE FROM notifications n
USING cleanup_gmh_load_reports t
WHERE n.report_id = t.id;

DELETE FROM report_feedbacks f
USING cleanup_gmh_load_reports t
WHERE f.report_id = t.id;

-- report_history, report_media and media_anonymization_failures cascade.
DELETE FROM reports r
USING cleanup_gmh_load_reports t
WHERE r.id = t.id;

DELETE FROM reputation_audit_logs
WHERE user_id = (
    SELECT id FROM app_users
    WHERE email = 'gumushacikoy.vatandas@kentiva.app'
)
  AND reason = 'REPORT_CREATED';

UPDATE app_users u
SET reputation_score = 225,
    loyalty_points = 780,
    updated_at = CURRENT_TIMESTAMP
WHERE u.email = 'gumushacikoy.vatandas@kentiva.app'
  AND u.municipality_id = (
      SELECT id FROM municipalities WHERE slug = 'gumushacikoy'
  );

COMMIT;
