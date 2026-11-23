-- H2: tightens existing tables. Hibernate creates them first on a fresh database.
-- Existing null values must be repaired before startup; do not fabricate defaults.
ALTER TABLE projects ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE projects ALTER COLUMN end_date SET NOT NULL;
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN estimate_hours SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN status SET NOT NULL;

-- Normalize the legacy alias before any domain entities are read.
UPDATE tasks SET status = 'DONE', finished_at = COALESCE(finished_at, created_at)
WHERE CAST(status AS VARCHAR) = 'COMPLETED';
