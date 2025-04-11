-- Security Incident Management Tables Migration
-- Creates the database schema for security incident lifecycle management

-- Create incident severity enum
CREATE TYPE incident_severity AS ENUM (
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);

-- Create incident status enum
CREATE TYPE incident_status AS ENUM (
  'DETECTED', 'INVESTIGATING', 'CONTAINING', 'REMEDIATING', 'RECOVERED', 'CLOSED', 'REOPENED'
);

-- Create incident type enum
CREATE TYPE incident_type AS ENUM (
  'UNAUTHORIZED_ACCESS', 'DATA_BREACH', 'MALWARE', 'PHISHING', 'INSIDER_THREAT',
  'DENIAL_OF_SERVICE', 'SUSPICIOUS_ACTIVITY', 'POLICY_VIOLATION', 'CONFIGURATION_ERROR',
  'SYSTEM_COMPROMISE', 'OTHER'
);

-- Create main security incidents table
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_type incident_type NOT NULL,
  severity incident_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'DETECTED',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_systems TEXT[],
  affected_data TEXT[],
  potential_impact TEXT,
  initial_vector TEXT,
  containment_strategy TEXT,
  remediation_plan TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  lessons_learned TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  requires_notification BOOLEAN NOT NULL DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create incident timeline events table
CREATE TABLE incident_timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_ids TEXT[],
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create incident evidence table
CREATE TABLE incident_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  evidence_type TEXT NOT NULL,
  file_path TEXT,
  content TEXT,
  metadata JSONB,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hash_value TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create incident response tasks table
CREATE TABLE incident_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create incident related vulnerabilities table
CREATE TABLE incident_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  vulnerability_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  cve_id TEXT,
  cvss_score DECIMAL,
  systems_affected TEXT[],
  fix_available BOOLEAN DEFAULT FALSE,
  fix_description TEXT,
  verification_status TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create incident notifications table
CREATE TABLE incident_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  recipients TEXT[],
  subject TEXT NOT NULL,
  content TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create incident post-mortem table
CREATE TABLE incident_postmortems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
  root_cause TEXT NOT NULL,
  impact_summary TEXT NOT NULL,
  detection_effectiveness TEXT,
  response_effectiveness TEXT,
  recovery_effectiveness TEXT,
  timeline_summary TEXT,
  contributing_factors TEXT[],
  corrective_actions TEXT[],
  preventive_actions TEXT[],
  lessons_learned TEXT[],
  follow_up_tasks TEXT[],
  reviewed_by UUID[] REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_security_incidents_type ON security_incidents(incident_type);
CREATE INDEX idx_security_incidents_detected_at ON security_incidents(detected_at);
CREATE INDEX idx_security_incidents_reported_by ON security_incidents(reported_by);
CREATE INDEX idx_security_incidents_assigned_to ON security_incidents(assigned_to);
CREATE INDEX idx_security_incidents_not_deleted ON security_incidents(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX idx_incident_timeline_incident_id ON incident_timeline_events(incident_id);
CREATE INDEX idx_incident_timeline_event_time ON incident_timeline_events(event_time);
CREATE INDEX idx_incident_timeline_not_deleted ON incident_timeline_events(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX idx_incident_evidence_incident_id ON incident_evidence(incident_id);
CREATE INDEX idx_incident_evidence_evidence_type ON incident_evidence(evidence_type);
CREATE INDEX idx_incident_evidence_not_deleted ON incident_evidence(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX idx_incident_tasks_incident_id ON incident_tasks(incident_id);
CREATE INDEX idx_incident_tasks_status ON incident_tasks(status);
CREATE INDEX idx_incident_tasks_assigned_to ON incident_tasks(assigned_to);
CREATE INDEX idx_incident_tasks_due_date ON incident_tasks(due_date);
CREATE INDEX idx_incident_tasks_not_deleted ON incident_tasks(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX idx_incident_vulnerabilities_incident_id ON incident_vulnerabilities(incident_id);
CREATE INDEX idx_incident_vulnerabilities_cve_id ON incident_vulnerabilities(cve_id);
CREATE INDEX idx_incident_vulnerabilities_not_deleted ON incident_vulnerabilities(is_deleted) WHERE is_deleted = FALSE;

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update 'updated_at' on record change
CREATE TRIGGER update_security_incidents_updated_at
BEFORE UPDATE ON security_incidents
FOR EACH ROW
EXECUTE FUNCTION update_incident_updated_at();

CREATE TRIGGER update_incident_tasks_updated_at
BEFORE UPDATE ON incident_tasks
FOR EACH ROW
EXECUTE FUNCTION update_incident_updated_at();

CREATE TRIGGER update_incident_vulnerabilities_updated_at
BEFORE UPDATE ON incident_vulnerabilities
FOR EACH ROW
EXECUTE FUNCTION update_incident_updated_at();

CREATE TRIGGER update_incident_postmortems_updated_at
BEFORE UPDATE ON incident_postmortems
FOR EACH ROW
EXECUTE FUNCTION update_incident_updated_at();

-- Function to prevent hard delete
CREATE OR REPLACE FUNCTION prevent_incident_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard deletion of incident records is not allowed. Use soft delete instead.';
END;
$$ LANGUAGE plpgsql;

-- Triggers to prevent hard deletion
CREATE TRIGGER prevent_security_incidents_hard_delete
BEFORE DELETE ON security_incidents
FOR EACH ROW
EXECUTE FUNCTION prevent_incident_hard_delete();

CREATE TRIGGER prevent_incident_timeline_hard_delete
BEFORE DELETE ON incident_timeline_events
FOR EACH ROW
EXECUTE FUNCTION prevent_incident_hard_delete();

CREATE TRIGGER prevent_incident_evidence_hard_delete
BEFORE DELETE ON incident_evidence
FOR EACH ROW
EXECUTE FUNCTION prevent_incident_hard_delete();

-- Create stored procedures for incident management

-- Procedure to create a new security incident
CREATE OR REPLACE PROCEDURE create_security_incident(
  p_title TEXT,
  p_description TEXT,
  p_incident_type incident_type,
  p_severity incident_severity,
  p_reported_by UUID,
  p_affected_systems TEXT[] DEFAULT NULL,
  p_affected_data TEXT[] DEFAULT NULL,
  p_potential_impact TEXT DEFAULT NULL,
  p_initial_vector TEXT DEFAULT NULL
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_incident_id UUID;
BEGIN
  -- Insert new incident
  INSERT INTO security_incidents (
    title, description, incident_type, severity, status,
    reported_by, affected_systems, affected_data, potential_impact, initial_vector
  ) 
  VALUES (
    p_title, p_description, p_incident_type, p_severity, 'DETECTED',
    p_reported_by, p_affected_systems, p_affected_data, p_potential_impact, p_initial_vector
  )
  RETURNING id INTO v_incident_id;
  
  -- Create initial timeline event
  INSERT INTO incident_timeline_events (
    incident_id, event_type, description, performed_by
  )
  VALUES (
    v_incident_id, 'DETECTION', 'Incident detected and reported', p_reported_by
  );
END;
$$;

-- Function to update incident status with timeline event
CREATE OR REPLACE PROCEDURE update_incident_status(
  p_incident_id UUID,
  p_new_status incident_status,
  p_user_id UUID,
  p_description TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_status incident_status;
  v_description TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status FROM security_incidents WHERE id = p_incident_id;
  
  -- Update incident status
  UPDATE security_incidents
  SET status = p_new_status
  WHERE id = p_incident_id;
  
  -- Create description if not provided
  IF p_description IS NULL THEN
    v_description := 'Status changed from ' || v_old_status || ' to ' || p_new_status;
  ELSE
    v_description := p_description;
  END IF;
  
  -- Add timeline event
  INSERT INTO incident_timeline_events (
    incident_id, event_type, description, performed_by
  )
  VALUES (
    p_incident_id, 'STATUS_CHANGE', v_description, p_user_id
  );
  
  -- If status is changing to RESOLVED, set resolved_at timestamp
  IF p_new_status = 'RECOVERED' THEN
    UPDATE security_incidents
    SET resolved_at = now()
    WHERE id = p_incident_id;
  END IF;
END;
$$;

-- Set up RLS policies for incident tables

-- Enable RLS on all incident tables
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_postmortems ENABLE ROW LEVEL SECURITY;

-- Create policy for reading incidents (security team and admins)
CREATE POLICY incident_select_policy ON security_incidents
  FOR SELECT
  USING (
    (auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE permission = 'view_security_incidents' AND is_active = TRUE
    )) OR
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('admin', 'security_analyst', 'security_admin') AND is_active = TRUE
    ))
  );

-- Create policy for inserting incidents (security team, admins and automated systems)
CREATE POLICY incident_insert_policy ON security_incidents
  FOR INSERT
  WITH CHECK (
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('admin', 'security_analyst', 'security_admin', 'service') AND is_active = TRUE
    ))
  );

-- Create policy for updating incidents (security team and admins)
CREATE POLICY incident_update_policy ON security_incidents
  FOR UPDATE
  USING (
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('admin', 'security_analyst', 'security_admin') AND is_active = TRUE
    ))
  );

-- Similar policies for related tables
CREATE POLICY incident_timeline_select_policy ON incident_timeline_events
  FOR SELECT
  USING (
    (auth.uid() IN (
      SELECT user_id FROM user_permissions 
      WHERE permission = 'view_security_incidents' AND is_active = TRUE
    )) OR
    (auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('admin', 'security_analyst', 'security_admin') AND is_active = TRUE
    ))
  );

-- Create views for common incident queries

-- View for active incidents
CREATE VIEW active_incidents AS
SELECT 
  i.id,
  i.title,
  i.incident_type,
  i.severity,
  i.status,
  i.detected_at,
  i.reported_by,
  u1.email as reported_by_email,
  i.assigned_to,
  u2.email as assigned_to_email,
  i.affected_systems,
  i.affected_data,
  i.potential_impact,
  i.initial_vector,
  i.requires_notification,
  i.notification_sent_at,
  (SELECT COUNT(*) FROM incident_tasks WHERE incident_id = i.id AND status != 'COMPLETED' AND is_deleted = FALSE) as open_tasks_count,
  (SELECT MAX(event_time) FROM incident_timeline_events WHERE incident_id = i.id AND is_deleted = FALSE) as last_activity
FROM 
  security_incidents i
LEFT JOIN 
  auth.users u1 ON i.reported_by = u1.id
LEFT JOIN 
  auth.users u2 ON i.assigned_to = u2.id
WHERE 
  i.is_deleted = FALSE AND
  i.status NOT IN ('CLOSED', 'RECOVERED')
ORDER BY 
  CASE 
    WHEN i.severity = 'CRITICAL' THEN 1
    WHEN i.severity = 'HIGH' THEN 2
    WHEN i.severity = 'MEDIUM' THEN 3
    WHEN i.severity = 'LOW' THEN 4
    ELSE 5
  END,
  i.detected_at DESC;

-- View for incidents requiring notification
CREATE VIEW incidents_requiring_notification AS
SELECT 
  i.id,
  i.title,
  i.incident_type,
  i.severity,
  i.status,
  i.detected_at,
  i.affected_data,
  i.potential_impact,
  i.requires_notification,
  i.notification_sent_at
FROM 
  security_incidents i
WHERE 
  i.is_deleted = FALSE AND
  i.requires_notification = TRUE AND
  i.notification_sent_at IS NULL
ORDER BY 
  i.severity,
  i.detected_at; 