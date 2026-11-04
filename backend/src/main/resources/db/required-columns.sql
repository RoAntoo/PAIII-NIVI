-- H2: runs after Hibernate creates/updates the existing tables.
-- Existing null values must be repaired before startup; do not fabricate defaults.
ALTER TABLE projects ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE projects ALTER COLUMN end_date SET NOT NULL;
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN estimate_hours SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN status SET NOT NULL;
