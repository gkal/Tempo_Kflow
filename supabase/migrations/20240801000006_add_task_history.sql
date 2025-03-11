-- Create enum for task history action types
CREATE TYPE task_history_action AS ENUM (
  'created',
  'reassigned',
  'status_changed',
  'completed',
  'cancelled'
);

-- Create task history table
CREATE TABLE task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  action task_history_action NOT NULL,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Add indexes for better query performance
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_task_history_created_at ON task_history(created_at);

-- Add trigger to automatically create history entry when task is reassigned
CREATE OR REPLACE FUNCTION create_task_reassignment_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO task_history (
      task_id,
      action,
      from_user_id,
      to_user_id,
      created_by
    ) VALUES (
      NEW.id,
      'reassigned',
      OLD.assigned_to,
      NEW.assigned_to,
      NEW.modified_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_reassignment_history
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_task_reassignment_history(); 