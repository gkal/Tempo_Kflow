-- SQL script to remove all foreign key constraints from the offer_history table

-- Disable RLS temporarily to make changes easier
ALTER TABLE offer_history DISABLE ROW LEVEL SECURITY;

-- Drop all foreign key constraints on offer_history table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'offer_history'::regclass AND contype = 'f')
    LOOP
        EXECUTE 'ALTER TABLE offer_history DROP CONSTRAINT ' || r.conname;
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Modify the columns to remove NOT NULL constraints where appropriate
ALTER TABLE offer_history 
ALTER COLUMN previous_assigned_to DROP NOT NULL,
ALTER COLUMN new_assigned_to DROP NOT NULL,
ALTER COLUMN changed_by DROP NOT NULL;

-- Create a completely new trigger function that doesn't rely on foreign keys
DROP TRIGGER IF EXISTS record_offer_change_trigger ON offers;
DROP FUNCTION IF EXISTS record_offer_change();

CREATE OR REPLACE FUNCTION record_offer_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert history record without any foreign key checks
  INSERT INTO offer_history (
    offer_id,
    previous_status,
    new_status,
    previous_assigned_to,
    new_assigned_to,
    previous_result,
    new_result,
    previous_amount,
    new_amount,
    previous_requirements,
    new_requirements,
    changed_by,
    notes
  ) VALUES (
    NEW.id,
    OLD.offer_result,
    NEW.offer_result,
    NULL, -- Avoid foreign key issues
    NULL, -- Avoid foreign key issues
    OLD.result,
    NEW.result,
    OLD.amount,
    NEW.amount,
    NULL,
    NULL,
    NULL, -- Avoid foreign key issues
    'Offer updated'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a new trigger to call the function on offer updates
CREATE TRIGGER record_offer_change_trigger
AFTER UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION record_offer_change();

-- Re-enable RLS
ALTER TABLE offer_history ENABLE ROW LEVEL SECURITY; 