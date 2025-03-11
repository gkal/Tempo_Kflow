-- Enable Row Level Security for tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view tasks they created or are assigned to
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT
  USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'Admin' OR users.role = 'Super User')
    )
  );

-- Create policy for users to insert tasks
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'Admin' OR users.role = 'Super User')
    )
  );

-- Create policy for users to update tasks they created or are assigned to
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE
  USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'Admin' OR users.role = 'Super User')
    )
  );

-- Create policy for users to delete tasks they created
CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'Admin')
    )
  ); 