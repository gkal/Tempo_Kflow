-- Drop existing foreign key if it exists
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_related_task_id_fkey;

-- Add proper foreign key constraint for related_task_id
ALTER TABLE notifications
ADD CONSTRAINT notifications_related_task_id_fkey
FOREIGN KEY (related_task_id)
REFERENCES tasks(id)
ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_related_task_id ON notifications(related_task_id);

-- Update the RLS policies to allow access to related data
ALTER POLICY "Users can view their own notifications"
ON notifications
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT created_by FROM tasks WHERE id = notifications.related_task_id
  )
); 