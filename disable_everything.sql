-- SQL script to disable RLS and remove the trigger function completely

-- Disable RLS on the offer_history table
ALTER TABLE offer_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view offer history" ON offer_history;
DROP POLICY IF EXISTS "Users can insert offer history" ON offer_history;
DROP POLICY IF EXISTS insert_offer_history ON offer_history;
DROP POLICY IF EXISTS select_offer_history ON offer_history;
DROP POLICY IF EXISTS "Allow all operations on offer_history" ON offer_history;

-- Drop the trigger and function completely
DROP TRIGGER IF EXISTS record_offer_change_trigger ON offers;
DROP FUNCTION IF EXISTS record_offer_change();

-- Grant full permissions to authenticated users
GRANT ALL ON offer_history TO authenticated;
GRANT ALL ON offers TO authenticated; 