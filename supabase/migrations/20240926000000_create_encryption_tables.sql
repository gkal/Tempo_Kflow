-- Migration for encryption tables and procedures
-- Used by the encryption service for data encryption at rest, 
-- transport layer security, and field-level encryption

-- Create encryption_keys table to store encryption keys
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL, -- Base64 encoded encryption key
  algorithm TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL,
  purpose TEXT NOT NULL -- 'data', 'transport', or 'field'
);

-- Create encryption_events table for audit logging
CREATE TABLE IF NOT EXISTS public.encryption_events (
  id UUID PRIMARY KEY,
  operation TEXT NOT NULL, -- 'encrypt', 'decrypt', 'key_rotation', 'key_creation', 'key_deletion'
  resource_type TEXT NOT NULL,
  resource_id UUID,
  user_id UUID REFERENCES public.users(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB
);

-- Create an index on timestamp for efficient querying
CREATE INDEX IF NOT EXISTS idx_encryption_events_timestamp ON public.encryption_events(timestamp);

-- Create an index on operation and resource_type for common queries
CREATE INDEX IF NOT EXISTS idx_encryption_events_operation_resource ON public.encryption_events(operation, resource_type);

-- Create a function to create the encryption_keys table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_encryption_keys_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'encryption_keys'
  ) THEN
    CREATE TABLE public.encryption_keys (
      id UUID PRIMARY KEY,
      key TEXT NOT NULL,
      algorithm TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      version INTEGER NOT NULL,
      purpose TEXT NOT NULL
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to create the encryption_events table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_encryption_events_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'encryption_events'
  ) THEN
    CREATE TABLE public.encryption_events (
      id UUID PRIMARY KEY,
      operation TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID,
      user_id UUID REFERENCES public.users(id),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      success BOOLEAN NOT NULL,
      error_message TEXT,
      metadata JSONB
    );
    
    -- Create indexes
    CREATE INDEX idx_encryption_events_timestamp ON public.encryption_events(timestamp);
    CREATE INDEX idx_encryption_events_operation_resource ON public.encryption_events(operation, resource_type);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cleanup function to delete old encryption events
CREATE OR REPLACE FUNCTION public.cleanup_old_encryption_events(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deletion_date TIMESTAMPTZ;
  deleted_count INTEGER;
BEGIN
  deletion_date := NOW() - (days_to_keep * INTERVAL '1 day');
  
  DELETE FROM public.encryption_events 
  WHERE timestamp < deletion_date
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for encryption_keys table
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- Only allow access to encryption keys for admins
CREATE POLICY encryption_keys_admin_policy ON public.encryption_keys
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Add RLS policies for encryption_events table
ALTER TABLE public.encryption_events ENABLE ROW LEVEL SECURITY;

-- Allow admins full access to encryption events
CREATE POLICY encryption_events_admin_policy ON public.encryption_events
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Create a scheduled function to automatically rotate keys
CREATE OR REPLACE FUNCTION public.check_and_rotate_expired_encryption_keys()
RETURNS VOID AS $$
DECLARE
  key_record RECORD;
  new_key_id UUID;
  new_key TEXT;
BEGIN
  -- Loop through keys that are expiring within 3 days
  FOR key_record IN
    SELECT id, purpose 
    FROM public.encryption_keys 
    WHERE is_active = TRUE 
    AND expires_at <= (NOW() + INTERVAL '3 days')
  LOOP
    -- Generate a new key
    new_key_id := uuid_generate_v4();
    new_key := encode(gen_random_bytes(32), 'base64');
    
    -- Insert the new key
    INSERT INTO public.encryption_keys (
      id, key, algorithm, created_at, expires_at, is_active, version, purpose
    ) VALUES (
      new_key_id,
      new_key,
      'aes-256-gcm',
      NOW(),
      NOW() + INTERVAL '30 days',
      TRUE,
      1,
      key_record.purpose
    );
    
    -- Deactivate the old key
    UPDATE public.encryption_keys 
    SET is_active = FALSE 
    WHERE id = key_record.id;
    
    -- Log the key rotation
    INSERT INTO public.encryption_events (
      id, operation, resource_type, resource_id, timestamp, success, metadata
    ) VALUES (
      uuid_generate_v4(),
      'key_rotation',
      'encryption_key',
      key_record.id,
      NOW(),
      TRUE,
      jsonb_build_object(
        'new_key_id', new_key_id, 
        'purpose', key_record.purpose
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_encryption_keys_table_if_not_exists TO service_role;
GRANT EXECUTE ON FUNCTION public.create_encryption_events_table_if_not_exists TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_encryption_events TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_rotate_expired_encryption_keys TO service_role;

-- Create extensions if not already created
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON TABLE public.encryption_keys IS 'Stores encryption keys for data-at-rest, transport, and field-level encryption';
COMMENT ON TABLE public.encryption_events IS 'Audit log for encryption-related operations';
COMMENT ON FUNCTION public.create_encryption_keys_table_if_not_exists() IS 'Creates the encryption_keys table if it does not exist';
COMMENT ON FUNCTION public.create_encryption_events_table_if_not_exists() IS 'Creates the encryption_events table if it does not exist';
COMMENT ON FUNCTION public.cleanup_old_encryption_events(INTEGER) IS 'Removes encryption event logs older than the specified number of days';
COMMENT ON FUNCTION public.check_and_rotate_expired_encryption_keys() IS 'Checks for expiring encryption keys and rotates them automatically'; 