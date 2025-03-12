-- SQL script to fix the trigger function that's causing the issue

-- Drop the existing trigger
DROP TRIGGER IF EXISTS record_offer_change_trigger ON offers;

-- Drop the existing function
DROP FUNCTION IF EXISTS record_offer_change();

-- Create a new function that handles missing users properly
CREATE OR REPLACE FUNCTION record_offer_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Use the created_by field from the offer
  current_user_id := NEW.created_by;
  
  -- Insert history record with NULL for missing users
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
    NULL, -- Set to NULL to avoid foreign key issues
    NEW.assigned_to,
    OLD.result,
    NEW.result,
    OLD.amount,
    NEW.amount,
    NULL, -- No requirements field in offers table
    NULL, -- No requirements field in offers table
    current_user_id, -- Use the created_by field
    'Offer updated'
  );
  
  -- Check if this is a handoff (assigned_to changed)
  IF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NOT NULL AND OLD.assigned_to <> NEW.assigned_to THEN
    -- Get customer name for the task title
    DECLARE
      customer_name TEXT;
    BEGIN
      SELECT company_name INTO customer_name
      FROM customers
      WHERE id = NEW.customer_id;
      
      -- Create a task for the new assignee
      INSERT INTO tasks (
        title,
        description,
        status,
        created_by,
        assigned_to,
        offer_id
      ) VALUES (
        'Offer reassigned to you: ' || COALESCE(customer_name, 'Customer'),
        'This offer has been reassigned to you. Please review and take appropriate action.',
        'pending',
        current_user_id, -- Use the created_by field
        NEW.assigned_to,
        NEW.id
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a new trigger to call the function on offer updates
CREATE TRIGGER record_offer_change_trigger
AFTER UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION record_offer_change(); 