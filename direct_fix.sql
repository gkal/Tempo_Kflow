-- Direct fix for the offer_history table constraints
-- Run this in the Supabase SQL editor

-- Drop the specific constraint causing the issue
ALTER TABLE offer_history DROP CONSTRAINT IF EXISTS offer_history_changed_by_fkey;

-- Make the column nullable
ALTER TABLE offer_history ALTER COLUMN changed_by DROP NOT NULL;

-- Also drop the previous_assigned_to constraint if it exists
ALTER TABLE offer_history DROP CONSTRAINT IF EXISTS offer_history_previous_assigned_to_fkey;

-- Make the column nullable
ALTER TABLE offer_history ALTER COLUMN previous_assigned_to DROP NOT NULL;

-- Also drop the new_assigned_to constraint if it exists
ALTER TABLE offer_history DROP CONSTRAINT IF EXISTS offer_history_new_assigned_to_fkey;

-- Make the column nullable
ALTER TABLE offer_history ALTER COLUMN new_assigned_to DROP NOT NULL;

-- Update the trigger function to avoid foreign key issues
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
    changed_by,
    notes
  ) VALUES (
    NEW.id,
    OLD.offer_result,
    NEW.offer_result,
    NULL, -- Set to NULL to avoid foreign key issues
    NULL, -- Set to NULL to avoid foreign key issues
    OLD.result,
    NEW.result,
    OLD.amount,
    NEW.amount,
    NULL, -- Set to NULL to avoid foreign key issues
    'Offer updated'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 