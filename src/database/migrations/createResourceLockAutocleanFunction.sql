-- Migration file to create automatic cleanup function for expired resource locks

-- Create cleanup function for expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_resource_locks()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete expired locks
  DELETE FROM resource_locks
  WHERE expires_at < NOW();
  
  RETURN NULL; -- For AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS resource_locks_cleanup_trigger ON resource_locks;

-- Create the trigger to run after insert or update on resource_locks
CREATE TRIGGER resource_locks_cleanup_trigger
AFTER INSERT OR UPDATE ON resource_locks
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_expired_resource_locks();

-- Create a scheduled function that runs periodically to clean up expired locks
-- (This is important as triggers won't run if no inserts/updates happen)
CREATE OR REPLACE FUNCTION periodic_cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM resource_locks
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add a statement to run the cleanup immediately to clear any existing expired locks
DO $$
BEGIN
  PERFORM periodic_cleanup_expired_locks();
END $$; 