-- Remove RLS from resource_locks table
ALTER TABLE resource_locks DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies 
DROP POLICY IF EXISTS "Users can view all locks" ON resource_locks;
DROP POLICY IF EXISTS "Users can create locks" ON resource_locks;
DROP POLICY IF EXISTS "Users can update their own locks" ON resource_locks;
DROP POLICY IF EXISTS "Users can update locks" ON resource_locks;
DROP POLICY IF EXISTS "Users can delete their own locks" ON resource_locks;
DROP POLICY IF EXISTS "Users can delete locks" ON resource_locks;

-- Just make sure proper grants exist
GRANT ALL PRIVILEGES ON TABLE resource_locks TO authenticated;
GRANT ALL PRIVILEGES ON TABLE resource_locks TO service_role;
GRANT ALL PRIVILEGES ON TABLE resource_locks TO anon; 