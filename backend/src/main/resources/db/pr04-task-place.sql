-- Nullable for existing tasks. Only the provider's place ID is persisted.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS place_id VARCHAR(1024);
