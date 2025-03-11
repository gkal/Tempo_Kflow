-- Drop existing column if it exists (to avoid conflicts)
ALTER TABLE notifications 
DROP COLUMN IF EXISTS sender_id;

-- Add sender_id column to notifications table without foreign key constraint
ALTER TABLE notifications 
ADD COLUMN sender_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);

-- Update existing notifications to set sender_id from related tasks
UPDATE notifications n
SET sender_id = t.created_by
FROM tasks t
WHERE n.related_task_id = t.id
AND n.sender_id IS NULL;

COMMENT ON COLUMN notifications.sender_id IS 'The ID of the user who sent/created the notification'; 