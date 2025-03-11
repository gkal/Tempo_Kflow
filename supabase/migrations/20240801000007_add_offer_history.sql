-- Create enum for offer change types
CREATE TYPE offer_change_type AS ENUM (
  'created',
  'updated',
  'status_changed',
  'comment_added',
  'amount_changed',
  'assigned_changed'
);

-- Create offer history table
CREATE TABLE offer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  change_type offer_change_type NOT NULL,
  previous_data JSONB,  -- Store the previous state of changed fields
  new_data JSONB,      -- Store the new state of changed fields
  comments TEXT,       -- Any comments about the change
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Add indexes for better query performance
CREATE INDEX idx_offer_history_offer_id ON offer_history(offer_id);
CREATE INDEX idx_offer_history_created_at ON offer_history(created_at);

-- Create a function to handle offer changes
CREATE OR REPLACE FUNCTION track_offer_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_type offer_change_type;
  previous_data_json JSONB;
  new_data_json JSONB;
BEGIN
  -- Determine the type of change
  IF TG_OP = 'INSERT' THEN
    change_type := 'created';
    previous_data_json := NULL;
    new_data_json := row_to_json(NEW)::JSONB - 'id' - 'created_at' - 'updated_at';
  ELSE
    -- Check what kind of update it is
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      change_type := 'status_changed';
      previous_data_json := jsonb_build_object('status', OLD.status);
      new_data_json := jsonb_build_object('status', NEW.status);
    ELSIF NEW.amount IS DISTINCT FROM OLD.amount THEN
      change_type := 'amount_changed';
      previous_data_json := jsonb_build_object('amount', OLD.amount);
      new_data_json := jsonb_build_object('amount', NEW.amount);
    ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      change_type := 'assigned_changed';
      previous_data_json := jsonb_build_object('assigned_to', OLD.assigned_to);
      new_data_json := jsonb_build_object('assigned_to', NEW.assigned_to);
    ELSE
      change_type := 'updated';
      previous_data_json := row_to_json(OLD)::JSONB - 'id' - 'created_at' - 'updated_at';
      new_data_json := row_to_json(NEW)::JSONB - 'id' - 'created_at' - 'updated_at';
    END IF;
  END IF;

  -- Insert the history record
  INSERT INTO offer_history (
    offer_id,
    change_type,
    previous_data,
    new_data,
    created_by
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    change_type,
    previous_data_json,
    new_data_json,
    COALESCE(NEW.modified_by, NEW.created_by, OLD.created_by)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to track all offer changes
CREATE TRIGGER offer_changes_trigger
  AFTER INSERT OR UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION track_offer_changes();

-- Create a function to add comments to offer history
CREATE OR REPLACE FUNCTION add_offer_comment(
  p_offer_id UUID,
  p_comment TEXT,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  INSERT INTO offer_history (
    offer_id,
    change_type,
    comments,
    created_by
  ) VALUES (
    p_offer_id,
    'comment_added',
    p_comment,
    p_user_id
  );
END;
$$ LANGUAGE plpgsql; 