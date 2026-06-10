ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS slug VARCHAR(120);

ALTER TABLE departments
    DROP CONSTRAINT IF EXISTS departments_name_key;

WITH normalized AS (
    SELECT
        d.id,
        d.municipality_id,
        CASE
            WHEN trim(
                BOTH '-' FROM regexp_replace(
                    translate(lower(coalesce(d.name, '')),
                              'çğıöşüâîûÇĞİÖŞÜÂÎÛ',
                              'cgiosuaiucgiosuaiu'),
                    '[^a-z0-9]+',
                    '-',
                    'g'
                )
            ) = '' THEN 'department'
            ELSE trim(
                BOTH '-' FROM regexp_replace(
                    translate(lower(coalesce(d.name, '')),
                              'çğıöşüâîûÇĞİÖŞÜÂÎÛ',
                              'cgiosuaiucgiosuaiu'),
                    '[^a-z0-9]+',
                    '-',
                    'g'
                )
            )
        END AS base_slug
    FROM departments d
),
ranked AS (
    SELECT
        n.id,
        n.municipality_id,
        n.base_slug,
        row_number() OVER (
            PARTITION BY n.municipality_id, n.base_slug
            ORDER BY n.id
        ) AS seq
    FROM normalized n
)
UPDATE departments d
SET slug = CASE
    WHEN r.seq = 1 THEN r.base_slug
    ELSE r.base_slug || '-' || r.seq
END
FROM ranked r
WHERE d.id = r.id
  AND (d.slug IS NULL OR trim(d.slug) = '');

ALTER TABLE departments
    ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_municipality_slug
    ON departments (municipality_id, slug);

CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_municipality_name
    ON departments (municipality_id, name);
