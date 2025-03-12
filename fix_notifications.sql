-- SQL script to fix the notifications table by adding the missing sender_id column

-- Add the missing sender_id column to the notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id);

-- Update the column to be nullable
ALTER TABLE notifications 
ALTER COLUMN sender_id DROP NOT NULL;

-- Grant permissions
GRANT ALL ON notifications TO authenticated; 