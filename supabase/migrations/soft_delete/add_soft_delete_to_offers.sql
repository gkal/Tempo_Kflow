-- SQL script to add soft delete functionality to the offers table
-- and ensure offer_details get properly handled

-- Step 1: First check if deleted_at column exists, if not, add it
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Step 2: Add index on deleted_at for improved performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_offers_deleted_at ON offers(deleted_at);

-- Step 3: Drop the function if it exists, then create the soft_delete_record function
DROP FUNCTION IF EXISTS soft_delete_record(TEXT, UUID);

CREATE OR REPLACE FUNCTION soft_delete_record(table_name TEXT, record_id UUID)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = NOW() WHERE id = %L', table_name, record_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Drop the function if it exists, then create the restore_deleted_record function
DROP FUNCTION IF EXISTS restore_deleted_record(TEXT, UUID);

CREATE OR REPLACE FUNCTION restore_deleted_record(table_name TEXT, record_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN;
BEGIN
  EXECUTE format('UPDATE %I SET deleted_at = NULL WHERE id = %L', table_name, record_id);
  GET DIAGNOSTICS success = ROW_COUNT;
  RETURN success > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Drop the function if it exists, then create the list_deleted_records function
DROP FUNCTION IF EXISTS list_deleted_records(TEXT);

CREATE OR REPLACE FUNCTION list_deleted_records(table_name TEXT)
RETURNS TABLE (
  id UUID,
  deleted_at TIMESTAMPTZ,
  record JSONB
) AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT id, deleted_at, row_to_json(%I)::jsonb AS record FROM %I WHERE deleted_at IS NOT NULL',
    table_name, table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Drop the function if it exists, then create the cleanup_soft_deleted_records function
DROP FUNCTION IF EXISTS cleanup_soft_deleted_records(TEXT);

CREATE OR REPLACE FUNCTION cleanup_soft_deleted_records(table_name TEXT)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  EXECUTE format(
    'DELETE FROM %I WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL ''30 days''',
    table_name
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Drop existing function if it exists, then create the function to clean up all tables
DROP FUNCTION IF EXISTS cleanup_all_soft_deleted_records();

CREATE OR REPLACE FUNCTION cleanup_all_soft_deleted_records()
RETURNS INT AS $$
DECLARE
  total_deleted INT := 0;
  deleted_count INT;
BEGIN
  -- Tables with soft delete
  SELECT cleanup_soft_deleted_records('offers') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('offer_details') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('customers') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('contacts') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('tasks') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  SELECT cleanup_soft_deleted_records('users') INTO deleted_count;
  total_deleted := total_deleted + deleted_count;
  
  RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Drop the function if it exists, then create function to ensure offer_details are soft-deleted 
DROP FUNCTION IF EXISTS sync_offer_details_soft_delete();

CREATE OR REPLACE FUNCTION sync_offer_details_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- When an offer is soft-deleted, soft-delete all its details
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE offer_details 
    SET deleted_at = NEW.deleted_at 
    WHERE offer_id = NEW.id AND deleted_at IS NULL;
  -- When an offer is restored, restore all its details
  ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    UPDATE offer_details 
    SET deleted_at = NULL 
    WHERE offer_id = NEW.id AND deleted_at IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add column to offer_details
ALTER TABLE offer_details ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index on deleted_at for improved performance
CREATE INDEX IF NOT EXISTS idx_offer_details_deleted_at ON offer_details(deleted_at);

-- Step 10: Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS sync_offer_details_soft_delete_trigger ON offers;

-- Step 11: Create the trigger
CREATE TRIGGER sync_offer_details_soft_delete_trigger
AFTER UPDATE OF deleted_at ON offers
FOR EACH ROW
EXECUTE FUNCTION sync_offer_details_soft_delete(); 