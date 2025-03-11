CREATE OR REPLACE FUNCTION create_notifications_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create notifications table if it doesn't exist
  CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    sender_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    related_task_id UUID REFERENCES tasks(id)
  );

  -- Create indexes for faster lookups
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

  -- Create trigger for updated_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'notifications_updated_at'
  ) THEN
    CREATE TRIGGER notifications_updated_at
      BEFORE UPDATE ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END;
$$; 