-- Migration file to create the resource_locks table
-- This table stores locks for resources across the application

-- Create extension for UUID generation if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the resource_locks table
CREATE TABLE IF NOT EXISTS resource_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(255) NOT NULL, -- Table name ('offers', 'customers', etc.)
  resource_id VARCHAR(255) NOT NULL,   -- The ID of the resource being locked
  user_id VARCHAR(255) NOT NULL,       -- ID of the user who holds the lock
  user_name VARCHAR(255) NOT NULL,     -- Name of the user for display purposes
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Add constraint to ensure resource uniqueness (one active lock per resource)
  CONSTRAINT unique_resource_lock UNIQUE(resource_type, resource_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_resource_locks_resource_type_id 
ON resource_locks(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_locks_user_id 
ON resource_locks(user_id);

CREATE INDEX IF NOT EXISTS idx_resource_locks_expires_at 
ON resource_locks(expires_at);

-- Grant necessary permissions - no RLS
GRANT ALL PRIVILEGES ON TABLE resource_locks TO authenticated;
GRANT ALL PRIVILEGES ON TABLE resource_locks TO service_role;
GRANT ALL PRIVILEGES ON TABLE resource_locks TO anon; 