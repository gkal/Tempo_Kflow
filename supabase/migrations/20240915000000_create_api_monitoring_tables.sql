-- Create the API performance logs table
CREATE TABLE IF NOT EXISTS api_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  request_size INTEGER,
  response_size INTEGER,
  user_id UUID REFERENCES auth.users(id),
  user_agent TEXT,
  ip_address TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the API resource usage table
CREATE TABLE IF NOT EXISTS api_resource_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cpu_usage FLOAT NOT NULL,
  memory_usage FLOAT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the API performance alerts table
CREATE TABLE IF NOT EXISTS api_performance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('response_time', 'error_rate', 'throughput', 'resource_usage')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message TEXT NOT NULL,
  endpoint TEXT,
  current_value FLOAT NOT NULL,
  threshold FLOAT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_endpoint ON api_performance_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_timestamp ON api_performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_performance_logs_success ON api_performance_logs(success);
CREATE INDEX IF NOT EXISTS idx_api_resource_usage_timestamp ON api_resource_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_performance_alerts_type ON api_performance_alerts(type);
CREATE INDEX IF NOT EXISTS idx_api_performance_alerts_severity ON api_performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_api_performance_alerts_resolved ON api_performance_alerts(resolved);

-- Create stored procedure for api_performance_table
CREATE OR REPLACE FUNCTION create_api_performance_table()
RETURNS VOID AS $$
BEGIN
  -- This function is called from the API service to ensure the table exists
  -- It's a no-op as the table is created in the migration
  RAISE NOTICE 'API performance table exists';
END;
$$ LANGUAGE plpgsql;

-- Create stored procedure for resource_usage_table
CREATE OR REPLACE FUNCTION create_resource_usage_table()
RETURNS VOID AS $$
BEGIN
  -- This function is called from the API service to ensure the table exists
  -- It's a no-op as the table is created in the migration
  RAISE NOTICE 'Resource usage table exists';
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for api_performance_logs
ALTER TABLE api_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for authenticated users" ON api_performance_logs
FOR INSERT TO authenticated
USING (true);

CREATE POLICY "Allow select for users with monitoring access" ON api_performance_logs
FOR SELECT TO authenticated
USING (
  auth.jwt() ->> 'app_metadata' ? 'roles' AND
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'admin' OR
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'monitoring'
);

-- Create RLS policies for api_resource_usage
ALTER TABLE api_resource_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for authenticated users" ON api_resource_usage
FOR INSERT TO authenticated
USING (true);

CREATE POLICY "Allow select for users with monitoring access" ON api_resource_usage
FOR SELECT TO authenticated
USING (
  auth.jwt() ->> 'app_metadata' ? 'roles' AND
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'admin' OR
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'monitoring'
);

-- Create RLS policies for api_performance_alerts
ALTER TABLE api_performance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for authenticated users" ON api_performance_alerts
FOR INSERT TO authenticated
USING (true);

CREATE POLICY "Allow select for users with monitoring access" ON api_performance_alerts
FOR SELECT TO authenticated
USING (
  auth.jwt() ->> 'app_metadata' ? 'roles' AND
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'admin' OR
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'monitoring'
);

CREATE POLICY "Allow update for users with monitoring access" ON api_performance_alerts
FOR UPDATE TO authenticated
USING (
  auth.jwt() ->> 'app_metadata' ? 'roles' AND
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'admin' OR
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'monitoring'
)
WITH CHECK (
  auth.jwt() ->> 'app_metadata' ? 'roles' AND
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'admin' OR
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'monitoring'
);

-- Add a function to acknowledge alerts
CREATE OR REPLACE FUNCTION acknowledge_alert(alert_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE api_performance_alerts
  SET acknowledged = TRUE,
      acknowledged_by = user_id,
      acknowledged_at = NOW()
  WHERE id = alert_id;
END;
$$ LANGUAGE plpgsql; 