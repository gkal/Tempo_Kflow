-- Audit Trail Tables Migration
-- Creates the database schema for comprehensive audit logging

-- Create audit action type enum
CREATE TYPE audit_action_type AS ENUM (
  -- User actions
  'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_ROLE_CHANGED',
  
  -- Form actions
  'FORM_CREATED', 'FORM_UPDATED', 'FORM_DELETED', 'FORM_VIEWED', 'FORM_SUBMITTED',
  'FORM_LINK_CREATED', 'FORM_LINK_SENT', 'FORM_LINK_EXPIRED', 'FORM_TEMPLATE_MODIFIED',
  'FORM_FIELD_ADDED', 'FORM_FIELD_UPDATED', 'FORM_FIELD_REMOVED', 'FORM_VALIDATION_MODIFIED',
  
  -- Approval workflow actions
  'APPROVAL_REQUESTED', 'FORM_APPROVED', 'FORM_REJECTED',
  'APPROVAL_REMINDER_SENT', 'APPROVAL_NOTIFICATION_SENT',
  
  -- Offer actions
  'OFFER_CREATED_FROM_FORM', 'OFFER_UPDATED', 'OFFER_DELETED',
  
  -- Customer actions
  'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_DELETED',
  
  -- System configuration actions
  'CONFIG_UPDATED', 'SECURITY_SETTING_CHANGED', 'EMAIL_TEMPLATE_MODIFIED',
  'SYSTEM_PARAMETER_UPDATED', 'FEATURE_FLAG_CHANGED',
  
  -- Export and reporting actions
  'DATA_EXPORTED', 'REPORT_GENERATED',
  
  -- Error events
  'SECURITY_ERROR', 'VALIDATION_ERROR', 'SYSTEM_ERROR'
);

-- Create audit severity type enum
CREATE TYPE audit_severity AS ENUM (
  'INFO', 'WARNING', 'ERROR', 'CRITICAL'
);

-- Create main audit trails table
CREATE TABLE audit_trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type audit_action_type NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  target_type TEXT,
  target_id TEXT,
  description TEXT NOT NULL,
  severity audit_severity NOT NULL DEFAULT 'INFO',
  metadata JSONB,
  before_state JSONB,
  after_state JSONB,
  location JSONB,
  session_id TEXT,
  request_id TEXT,
  signature TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create audit trail details table (for structured additional data)
CREATE TABLE audit_trail_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_trail_id UUID NOT NULL REFERENCES audit_trails(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit trail tags table (for efficient filtering)
CREATE TABLE audit_trail_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_trail_id UUID NOT NULL REFERENCES audit_trails(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_trails_timestamp ON audit_trails(timestamp);
CREATE INDEX idx_audit_trails_action_type ON audit_trails(action_type);
CREATE INDEX idx_audit_trails_user_id ON audit_trails(user_id);
CREATE INDEX idx_audit_trails_target_type_target_id ON audit_trails(target_type, target_id);
CREATE INDEX idx_audit_trails_severity ON audit_trails(severity);
CREATE INDEX idx_audit_trails_request_id ON audit_trails(request_id);
CREATE INDEX idx_audit_trails_not_deleted ON audit_trails(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX idx_audit_trail_details_audit_id ON audit_trail_details(audit_trail_id);
CREATE INDEX idx_audit_trail_details_key ON audit_trail_details(key);
CREATE INDEX idx_audit_trail_details_not_deleted ON audit_trail_details(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX idx_audit_trail_tags_audit_id ON audit_trail_tags(audit_trail_id);
CREATE INDEX idx_audit_trail_tags_tag ON audit_trail_tags(tag);
CREATE INDEX idx_audit_trail_tags_not_deleted ON audit_trail_tags(is_deleted) WHERE is_deleted = FALSE;

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update 'updated_at' on record change
CREATE TRIGGER update_audit_trails_updated_at
BEFORE UPDATE ON audit_trails
FOR EACH ROW
EXECUTE FUNCTION update_audit_updated_at();

-- Function to prevent hard delete
CREATE OR REPLACE FUNCTION prevent_audit_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletion of audit records is not allowed. Use soft delete instead.';
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent hard deletion
CREATE TRIGGER prevent_audit_trails_hard_delete
BEFORE DELETE ON audit_trails
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_hard_delete();

-- Create materialized view for efficient querying of recent audit events
CREATE MATERIALIZED VIEW recent_audit_events AS
SELECT 
  at.id,
  at.action_type,
  at.user_id,
  at.timestamp,
  at.description,
  at.severity,
  at.target_type,
  at.target_id,
  at.metadata,
  array_agg(DISTINCT tag.tag) AS tags
FROM 
  audit_trails at
LEFT JOIN 
  audit_trail_tags tag ON at.id = tag.audit_trail_id AND tag.is_deleted = FALSE
WHERE 
  at.is_deleted = FALSE AND
  at.timestamp > (now() - interval '30 days')
GROUP BY 
  at.id, at.action_type, at.user_id, at.timestamp, at.description, 
  at.severity, at.target_type, at.target_id, at.metadata
ORDER BY 
  at.timestamp DESC;

-- Create index on materialized view
CREATE INDEX idx_recent_audit_events_action_type ON recent_audit_events(action_type);
CREATE INDEX idx_recent_audit_events_user_id ON recent_audit_events(user_id);
CREATE INDEX idx_recent_audit_events_timestamp ON recent_audit_events(timestamp);
CREATE INDEX idx_recent_audit_events_severity ON recent_audit_events(severity);
CREATE INDEX idx_recent_audit_events_target ON recent_audit_events(target_type, target_id);

-- Function to refresh recent audit events view
CREATE OR REPLACE FUNCTION refresh_recent_audit_events()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY recent_audit_events;
END;
$$ LANGUAGE plpgsql;

-- Create a stored procedure for transaction handling
CREATE OR REPLACE PROCEDURE create_audit_log(
  p_action_type audit_action_type,
  p_user_id UUID,
  p_description TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_severity audit_severity DEFAULT 'INFO',
  p_metadata JSONB DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_audit_id UUID;
  v_tag TEXT;
BEGIN
  -- Insert main audit record
  INSERT INTO audit_trails (
    action_type, user_id, description, target_type, target_id, 
    severity, metadata, before_state, after_state
  ) 
  VALUES (
    p_action_type, p_user_id, p_description, p_target_type, p_target_id, 
    p_severity, p_metadata, p_before_state, p_after_state
  )
  RETURNING id INTO v_audit_id;
  
  -- Insert tags if provided
  IF p_tags IS NOT NULL THEN
    FOREACH v_tag IN ARRAY p_tags
    LOOP
      INSERT INTO audit_trail_tags (audit_trail_id, tag)
      VALUES (v_audit_id, v_tag);
    END LOOP;
  END IF;
  
  -- Return the created audit ID
  RETURN;
END;
$$;

-- Create a function to search audit logs with tag filtering
CREATE OR REPLACE FUNCTION search_audit_logs(
  p_action_types audit_action_type[] DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_severities audit_severity[] DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_search_text TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  action_type audit_action_type,
  user_id UUID,
  timestamp TIMESTAMPTZ,
  description TEXT,
  severity audit_severity,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  tags TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH tag_filter AS (
    SELECT DISTINCT audit_trail_id
    FROM audit_trail_tags
    WHERE 
      is_deleted = FALSE AND
      (p_tags IS NULL OR tag = ANY(p_tags))
  )
  SELECT 
    at.id,
    at.action_type,
    at.user_id,
    at.timestamp,
    at.description,
    at.severity,
    at.target_type,
    at.target_id,
    at.metadata,
    array_agg(DISTINCT tag.tag) AS tags
  FROM 
    audit_trails at
  LEFT JOIN 
    audit_trail_tags tag ON at.id = tag.audit_trail_id AND tag.is_deleted = FALSE
  WHERE 
    at.is_deleted = FALSE AND
    (p_action_types IS NULL OR at.action_type = ANY(p_action_types)) AND
    (p_user_id IS NULL OR at.user_id = p_user_id) AND
    (p_target_type IS NULL OR at.target_type = p_target_type) AND
    (p_target_id IS NULL OR at.target_id = p_target_id) AND
    (p_from_date IS NULL OR at.timestamp >= p_from_date) AND
    (p_to_date IS NULL OR at.timestamp <= p_to_date) AND
    (p_severities IS NULL OR at.severity = ANY(p_severities)) AND
    (p_tags IS NULL OR at.id IN (SELECT audit_trail_id FROM tag_filter)) AND
    (p_search_text IS NULL OR 
      at.description ILIKE '%' || p_search_text || '%' OR
      at.target_type ILIKE '%' || p_search_text || '%' OR
      at.target_id ILIKE '%' || p_search_text || '%')
  GROUP BY 
    at.id, at.action_type, at.user_id, at.timestamp, at.description, 
    at.severity, at.target_type, at.target_id, at.metadata
  ORDER BY 
    at.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Set up RLS policies for audit tables

-- Enable RLS on all audit tables
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail_tags ENABLE ROW LEVEL SECURITY;

-- Create policy for reading audit trails (only users with audit view permission)
CREATE POLICY audit_trails_select_policy ON audit_trails
  FOR SELECT
  USING (
    (auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE permission = 'view_audit_trails' AND is_active = TRUE
    )) OR
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role = 'admin' AND is_active = TRUE
    ))
  );

-- Create policy for inserting audit trails (service role or admin only)
CREATE POLICY audit_trails_insert_policy ON audit_trails
  FOR INSERT
  WITH CHECK (
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('admin', 'service') AND is_active = TRUE
    ))
  );

-- Create policy for updating audit trails (only soft delete allowed, admin only)
CREATE POLICY audit_trails_update_policy ON audit_trails
  FOR UPDATE
  USING (
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role = 'admin' AND is_active = TRUE
    )) AND
    (OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) -- Only allow soft delete updates
  );

-- Similar policies for details and tags
CREATE POLICY audit_trail_details_select_policy ON audit_trail_details
  FOR SELECT
  USING (
    (auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE permission = 'view_audit_details' AND is_active = TRUE
    )) OR
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role = 'admin' AND is_active = TRUE
    ))
  );

CREATE POLICY audit_trail_details_insert_policy ON audit_trail_details
  FOR INSERT
  WITH CHECK (
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('admin', 'service') AND is_active = TRUE
    ))
  );

CREATE POLICY audit_trail_tags_select_policy ON audit_trail_tags
  FOR SELECT
  USING (
    (auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE permission = 'view_audit_trails' AND is_active = TRUE
    )) OR
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role = 'admin' AND is_active = TRUE
    ))
  );

CREATE POLICY audit_trail_tags_insert_policy ON audit_trail_tags
  FOR INSERT
  WITH CHECK (
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('admin', 'service') AND is_active = TRUE
    ))
  );

-- Create purge function for archiving old audit data (to be run periodically)
CREATE OR REPLACE FUNCTION archive_old_audit_data(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  archive_cutoff TIMESTAMPTZ;
  archived_count INTEGER;
BEGIN
  archive_cutoff := now() - (retention_days * interval '1 day');
  
  -- Create archive copy in a separate table
  CREATE TABLE IF NOT EXISTS audit_trails_archive (LIKE audit_trails INCLUDING ALL);
  
  -- Move old records to archive
  WITH archived AS (
    UPDATE audit_trails
    SET is_deleted = TRUE
    WHERE 
      timestamp < archive_cutoff AND
      is_deleted = FALSE
    RETURNING *
  )
  INSERT INTO audit_trails_archive
  SELECT * FROM archived;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Refresh materialized view with latest data
  PERFORM refresh_recent_audit_events();
  
  RETURN archived_count;
END;
$$; 