-- Complete SQL script to fix offer history functionality

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS record_offer_change_trigger ON offers;
DROP FUNCTION IF EXISTS record_offer_change();

-- 2. Create or update the offer_history table
CREATE TABLE IF NOT EXISTS offer_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  previous_status VARCHAR,
  new_status VARCHAR NOT NULL,
  previous_assigned_to UUID REFERENCES auth.users(id),
  new_assigned_to UUID REFERENCES auth.users(id),
  previous_result VARCHAR,
  new_result VARCHAR,
  notes TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional fields to track other important changes
  previous_amount VARCHAR,
  new_amount VARCHAR,
  previous_requirements TEXT,
  new_requirements TEXT
);

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_offer_history_offer_id ON offer_history(offer_id);

-- 4. Set up Row Level Security
ALTER TABLE offer_history ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DROP POLICY IF EXISTS insert_offer_history ON offer_history;
CREATE POLICY insert_offer_history ON offer_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS select_offer_history ON offer_history;
CREATE POLICY select_offer_history ON offer_history
  FOR SELECT TO authenticated
  USING (true);

-- 6. Create the fixed trigger function
CREATE OR REPLACE FUNCTION record_offer_change()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Use the created_by field from the offer
  current_user_id := NEW.created_by;
  
  -- Insert history record
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
    OLD.assigned_to,
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
      
      -- Create a notification for the new assignee
      INSERT INTO notifications (
        user_id,
        message,
        type,
        related_task_id,
        read,
        created_at
      ) VALUES (
        NEW.assigned_to,
        'Offer reassigned to you: ' || COALESCE(customer_name, 'Customer'),
        'offer_reassigned',
        (SELECT id FROM tasks WHERE offer_id = NEW.id ORDER BY created_at DESC LIMIT 1),
        false,
        NOW()
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create the trigger
CREATE TRIGGER record_offer_change_trigger
AFTER UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION record_offer_change(); 