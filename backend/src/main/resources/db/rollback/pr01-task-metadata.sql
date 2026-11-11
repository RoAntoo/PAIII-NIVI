-- Manual rollback only, with the application stopped and the old code restored.
-- Back up the database first: the new metadata is intentionally discarded.
DROP INDEX IF EXISTS ux_tasks_client_request_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS client_request_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS category;
ALTER TABLE tasks DROP COLUMN IF EXISTS source;
