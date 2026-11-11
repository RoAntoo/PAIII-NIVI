-- H2, additive and safe to execute again. Hibernate creates these on fresh databases.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'MANUAL';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'GENERAL';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_request_id UUID;
UPDATE tasks SET source = 'MANUAL' WHERE source IS NULL;
UPDATE tasks SET category = 'GENERAL' WHERE category IS NULL;
ALTER TABLE tasks ALTER COLUMN source SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN category SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tasks_client_request_id ON tasks(client_request_id);
