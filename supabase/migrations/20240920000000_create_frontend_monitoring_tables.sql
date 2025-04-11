-- Create the frontend performance logs table
CREATE TABLE IF NOT EXISTS frontend_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_frontend_performance_logs_type ON frontend_performance_logs(type);
CREATE INDEX IF NOT EXISTS idx_frontend_performance_logs_timestamp ON frontend_performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_frontend_performance_logs_session_id ON frontend_performance_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_frontend_performance_logs_route ON frontend_performance_logs((data->>'route'));

-- Create stored procedure for frontend_performance_table
CREATE OR REPLACE FUNCTION create_frontend_performance_table()
RETURNS VOID AS $$
BEGIN
  -- This function is called from the service to ensure the table exists
  -- It's a no-op as the table is created in the migration
  RAISE NOTICE 'Frontend performance table exists';
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for frontend_performance_logs
ALTER TABLE frontend_performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for authenticated users" ON frontend_performance_logs
FOR INSERT TO authenticated
USING (true);

CREATE POLICY "Allow select for users with monitoring access" ON frontend_performance_logs
FOR SELECT TO authenticated
USING (
  auth.jwt() ->> 'app_metadata' ? 'roles' AND
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'admin' OR
  (auth.jwt() ->> 'app_metadata')::jsonb -> 'roles' ? 'monitoring'
);

-- Create performance data summary view for faster aggregations
CREATE VIEW frontend_performance_summary AS
WITH page_load_stats AS (
  SELECT
    DATE_TRUNC('day', (data->>'timestamp')::TIMESTAMPTZ) AS day,
    AVG((data->>'loadTime')::FLOAT) AS avg_load_time,
    AVG((data->>'firstContentfulPaint')::FLOAT) AS avg_first_contentful_paint,
    AVG((data->>'timeToInteractive')::FLOAT) AS avg_time_to_interactive,
    MIN((data->>'loadTime')::FLOAT) AS min_load_time,
    MAX((data->>'loadTime')::FLOAT) AS max_load_time,
    COUNT(*) AS page_load_count
  FROM frontend_performance_logs
  WHERE type = 'page_load'
  GROUP BY DATE_TRUNC('day', (data->>'timestamp')::TIMESTAMPTZ)
),
network_stats AS (
  SELECT
    DATE_TRUNC('day', (data->>'timestamp')::TIMESTAMPTZ) AS day,
    AVG((data->>'duration')::FLOAT) AS avg_network_time,
    MIN((data->>'duration')::FLOAT) AS min_network_time,
    MAX((data->>'duration')::FLOAT) AS max_network_time,
    COUNT(*) AS request_count,
    SUM(CASE WHEN (data->>'cached')::BOOLEAN THEN 1 ELSE 0 END) AS cached_count
  FROM frontend_performance_logs
  WHERE type = 'network_request'
  GROUP BY DATE_TRUNC('day', (data->>'timestamp')::TIMESTAMPTZ)
),
form_stats AS (
  SELECT
    DATE_TRUNC('day', (data->>'timestamp')::TIMESTAMPTZ) AS day,
    AVG((data->>'totalTime')::FLOAT) AS avg_form_time,
    MIN((data->>'totalTime')::FLOAT) AS min_form_time,
    MAX((data->>'totalTime')::FLOAT) AS max_form_time,
    COUNT(*) AS form_count,
    SUM(CASE WHEN (data->>'success')::BOOLEAN THEN 1 ELSE 0 END) AS success_count
  FROM frontend_performance_logs
  WHERE type = 'form_submission'
  GROUP BY DATE_TRUNC('day', (data->>'timestamp')::TIMESTAMPTZ)
)
SELECT
  p.day,
  p.avg_load_time,
  p.avg_first_contentful_paint,
  p.avg_time_to_interactive,
  p.min_load_time,
  p.max_load_time,
  p.page_load_count,
  n.avg_network_time,
  n.min_network_time,
  n.max_network_time,
  n.request_count,
  n.cached_count,
  CASE WHEN n.request_count > 0 THEN (n.cached_count::FLOAT / n.request_count) * 100 ELSE 0 END AS cache_hit_rate,
  f.avg_form_time,
  f.min_form_time,
  f.max_form_time,
  f.form_count,
  CASE WHEN f.form_count > 0 THEN (f.success_count::FLOAT / f.form_count) * 100 ELSE 0 END AS form_success_rate
FROM page_load_stats p
LEFT JOIN network_stats n ON p.day = n.day
LEFT JOIN form_stats f ON p.day = f.day
ORDER BY p.day DESC;

-- Create function to calculate performance score
CREATE OR REPLACE FUNCTION calculate_performance_score(
  load_time FLOAT,
  fcp FLOAT,
  tti FLOAT,
  network_time FLOAT
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 100;
BEGIN
  -- FCP: Good < 1000ms, Needs improvement < 3000ms, Poor > 3000ms
  IF fcp > 3000 THEN
    score := score - 25;
  ELSIF fcp > 1000 THEN
    score := score - 10;
  END IF;
  
  -- TTI: Good < 3800ms, Needs improvement < 7300ms, Poor > 7300ms
  IF tti > 7300 THEN
    score := score - 25;
  ELSIF tti > 3800 THEN
    score := score - 10;
  END IF;
  
  -- Network: Penalize if average is > 1000ms
  IF network_time > 1000 THEN
    score := score - 20;
  ELSIF network_time > 500 THEN
    score := score - 10;
  END IF;
  
  -- Page load: Penalize if average is > 3000ms
  IF load_time > 3000 THEN
    score := score - 15;
  ELSIF load_time > 1500 THEN
    score := score - 5;
  END IF;
  
  RETURN GREATEST(0, score);
END;
$$ LANGUAGE plpgsql;

-- Create API endpoint for performance monitoring (accessible only to authenticated users)
CREATE OR REPLACE FUNCTION record_frontend_performance(
  metrics JSONB,
  session_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  metric JSONB;
BEGIN
  FOR metric IN SELECT jsonb_array_elements(metrics)
  LOOP
    INSERT INTO frontend_performance_logs (
      type,
      session_id,
      data,
      timestamp
    ) VALUES (
      metric->>'type',
      session_id,
      metric->'data',
      COALESCE((metric->>'timestamp')::TIMESTAMPTZ, NOW())
    );
  END LOOP;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 