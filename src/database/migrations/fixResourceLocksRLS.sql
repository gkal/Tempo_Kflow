-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view all locks" ON resource_locks;
DROP POLICY IF EXISTS "Users can create locks" ON resource_locks;
DROP POLICY IF EXISTS "Users can update their own locks" ON resource_locks;
DROP POLICY IF EXISTS "Users can delete their own locks" ON resource_locks;

-- Create more permissive policies
-- Users can see all locks
CREATE POLICY "Users can view all locks" 
ON resource_locks FOR SELECT 
TO authenticated 
USING (true);

-- Fix the insert policy - allow any authenticated user to insert
CREATE POLICY "Users can create locks" 
ON resource_locks FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Users can update any lock (needed for conflict resolution)
CREATE POLICY "Users can update locks" 
ON resource_locks FOR UPDATE 
TO authenticated 
USING (true);

-- Users can delete their own locks
CREATE POLICY "Users can delete locks" 
ON resource_locks FOR DELETE 
TO authenticated 
USING (true);

-- Make sure permissions are properly set
GRANT ALL PRIVILEGES ON TABLE resource_locks TO authenticated;
GRANT ALL PRIVILEGES ON TABLE resource_locks TO service_role; 