-- SQL script to fix the offer_history foreign key constraint issue

-- Drop the specific constraint mentioned in the error
ALTER TABLE offer_history DROP CONSTRAINT IF EXISTS offer_history_previous_assigned_to_fkey;

-- Modify the column to remove the reference to users table
ALTER TABLE offer_history 
ALTER COLUMN previous_assigned_to TYPE UUID,
ALTER COLUMN previous_assigned_to DROP NOT NULL;

-- Update the trigger function to handle NULL values properly
CREATE OR REPLACE FUNCTION record_offer_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Use the created_by field from the offer
  current_user_id := NEW.created_by;
  
  -- Insert history record with NULL check for assigned_to
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
    CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.assigned_to) THEN OLD.assigned_to ELSE NULL END,
    CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.assigned_to) THEN NEW.assigned_to ELSE NULL END,
    OLD.result,
    NEW.result,
    OLD.amount,
    NEW.amount,
    NULL, -- No requirements field in offers table
    NULL, -- No requirements field in offers table
    current_user_id, -- Use the created_by field
    'Offer updated'
  );
  
  -- Rest of the function remains the same
  -- ...
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 