-- Create form analytics tables and functions

-- Create form_submission_analytics table
CREATE TABLE IF NOT EXISTS form_submission_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID NOT NULL,
  submission_id VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_time TIMESTAMP WITH TIME ZONE NOT NULL,
  time_to_complete INTEGER NOT NULL, -- in seconds
  device_type VARCHAR(50) NOT NULL,
  browser_info TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  error_count INTEGER NOT NULL DEFAULT 0,
  source VARCHAR(255),
  referrer VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create form_field_interactions table
CREATE TABLE IF NOT EXISTS form_field_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id VARCHAR(255) NOT NULL REFERENCES form_submission_analytics(submission_id) ON DELETE CASCADE,
  field_id VARCHAR(255) NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  focus_time INTEGER NOT NULL DEFAULT 0, -- in milliseconds
  error_count INTEGER NOT NULL DEFAULT 0,
  change_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submission_analytics_form_id 
  ON form_submission_analytics (form_id);

CREATE INDEX IF NOT EXISTS idx_form_submission_analytics_start_time 
  ON form_submission_analytics (start_time);

CREATE INDEX IF NOT EXISTS idx_form_submission_analytics_completion_time 
  ON form_submission_analytics (completion_time);

CREATE INDEX IF NOT EXISTS idx_form_submission_analytics_is_complete 
  ON form_submission_analytics (is_complete);

CREATE INDEX IF NOT EXISTS idx_form_field_interactions_submission_id 
  ON form_field_interactions (submission_id);

CREATE INDEX IF NOT EXISTS idx_form_field_interactions_field_id 
  ON form_field_interactions (field_id);

-- Function to get forms analytics summary
CREATE OR REPLACE FUNCTION get_forms_analytics_summary()
RETURNS TABLE (
  form_id UUID,
  form_name VARCHAR(255),
  total_submissions BIGINT,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fsa.form_id,
    f.name AS form_name,
    COUNT(fsa.id) AS total_submissions,
    ROUND(
      (COUNT(fsa.id) FILTER (WHERE fsa.is_complete = true) * 100.0) / 
      NULLIF(COUNT(fsa.id), 0)
    , 2) AS completion_rate
  FROM 
    form_submission_analytics fsa
    LEFT JOIN forms f ON fsa.form_id = f.id
  GROUP BY 
    fsa.form_id, f.name
  ORDER BY 
    total_submissions DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get field analytics by form
CREATE OR REPLACE FUNCTION get_field_analytics_by_form(
  p_form_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  field_id VARCHAR(255),
  field_name VARCHAR(255),
  interaction_count BIGINT,
  avg_focus_time NUMERIC,
  error_rate NUMERIC,
  abandonment_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH form_submissions AS (
    SELECT 
      id, 
      submission_id, 
      is_complete
    FROM 
      form_submission_analytics
    WHERE 
      form_id = p_form_id AND
      (p_start_date IS NULL OR start_time >= p_start_date) AND
      (p_end_date IS NULL OR completion_time <= p_end_date)
  ),
  field_stats AS (
    SELECT 
      ffi.field_id,
      ffi.field_name,
      SUM(ffi.interaction_count) AS total_interactions,
      AVG(ffi.focus_time) AS avg_focus_time,
      SUM(ffi.error_count) AS total_errors,
      COUNT(fs.id) AS submission_count,
      COUNT(fs.id) FILTER (WHERE fs.is_complete = false) AS incomplete_count
    FROM 
      form_field_interactions ffi
      JOIN form_submissions fs ON ffi.submission_id = fs.submission_id
    GROUP BY 
      ffi.field_id, ffi.field_name
  )
  SELECT 
    fs.field_id,
    fs.field_name,
    fs.total_interactions AS interaction_count,
    ROUND(fs.avg_focus_time, 2) AS avg_focus_time,
    ROUND((fs.total_errors * 100.0) / NULLIF(fs.submission_count, 0), 2) AS error_rate,
    ROUND((fs.incomplete_count * 100.0) / NULLIF(fs.submission_count, 0), 2) AS abandonment_rate
  FROM 
    field_stats fs
  ORDER BY 
    (error_rate + abandonment_rate) DESC;
END;
$$ LANGUAGE plpgsql; 