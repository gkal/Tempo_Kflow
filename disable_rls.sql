-- SQL script to completely disable RLS on the offer_history table

-- Disable RLS on the offer_history table
ALTER TABLE offer_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view offer history" ON offer_history;
DROP POLICY IF EXISTS "Users can insert offer history" ON offer_history;
DROP POLICY IF EXISTS insert_offer_history ON offer_history;
DROP POLICY IF EXISTS select_offer_history ON offer_history;
DROP POLICY IF EXISTS "Allow all operations on offer_history" ON offer_history;

-- Grant full permissions to authenticated users
GRANT ALL ON offer_history TO authenticated;

-- Update the trigger function to be simpler
DROP TRIGGER IF EXISTS record_offer_change_trigger ON offers;
DROP FUNCTION IF EXISTS record_offer_change();

CREATE OR REPLACE FUNCTION record_offer_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple insert without any checks
  INSERT INTO offer_history (
    offer_id,
    previous_status,
    new_status,
    previous_result,
    new_result,
    previous_amount,
    new_amount,
    notes
  ) VALUES (
    NEW.id,
    OLD.offer_result,
    NEW.offer_result,
    OLD.result,
    NEW.result,
    OLD.amount,
    NEW.amount,
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