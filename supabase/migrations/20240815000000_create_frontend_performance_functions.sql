-- Create frontend performance monitoring schema and functions

-- Function to set up required tables for frontend performance monitoring
CREATE OR REPLACE FUNCTION setup_frontend_performance_schema()
RETURNS void AS $$
BEGIN
  -- Create frontend_performance_logs table if it doesn't exist
  CREATE TABLE IF NOT EXISTS frontend_performance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    user_id UUID,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('page_load', 'component_render', 'network_request', 'user_interaction', 'form_submission')),
    metric_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- Create index for faster queries
  CREATE INDEX IF NOT EXISTS frontend_performance_logs_metric_type_idx 
    ON frontend_performance_logs (metric_type);
  
  CREATE INDEX IF NOT EXISTS frontend_performance_logs_session_id_idx 
    ON frontend_performance_logs (session_id);
  
  CREATE INDEX IF NOT EXISTS frontend_performance_logs_user_id_idx 
    ON frontend_performance_logs (user_id);
  
  CREATE INDEX IF NOT EXISTS frontend_performance_logs_created_at_idx 
    ON frontend_performance_logs (created_at);
  
  -- Create JSONB path operations index for common metric_data fields
  CREATE INDEX IF NOT EXISTS frontend_performance_logs_route_idx 
    ON frontend_performance_logs USING GIN ((metric_data -> 'route'));
END;
$$ LANGUAGE plpgsql;

-- Function to get aggregated frontend performance report
CREATE OR REPLACE FUNCTION get_frontend_performance_report(
  from_time TEXT,
  to_time TEXT
)
RETURNS JSON AS $$
DECLARE
  report JSON;
BEGIN
  WITH 
    -- Get page load metrics
    page_load_metrics AS (
      SELECT 
        metric_data->>'route' as route,
        (metric_data->>'loadTime')::FLOAT as load_time,
        (metric_data->>'firstContentfulPaint')::FLOAT as first_contentful_paint,
        (metric_data->>'timeToInteractive')::FLOAT as time_to_interactive
      FROM frontend_performance_logs
      WHERE 
        metric_type = 'page_load' AND
        created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
    ),
    
    -- Get network request metrics
    network_metrics AS (
      SELECT 
        metric_data->>'url' as url,
        metric_data->>'route' as route,
        metric_data->>'method' as method,
        (metric_data->>'duration')::FLOAT as duration,
        (metric_data->>'status')::INT as status,
        metric_data->>'resourceType' as resource_type
      FROM frontend_performance_logs
      WHERE 
        metric_type = 'network_request' AND
        created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
    ),
    
    -- Get component render metrics
    component_metrics AS (
      SELECT 
        metric_data->>'componentName' as component_name,
        metric_data->>'route' as route,
        (metric_data->>'renderTime')::FLOAT as render_time,
        (metric_data->>'rerenders')::INT as rerenders
      FROM frontend_performance_logs
      WHERE 
        metric_type = 'component_render' AND
        created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
    ),
    
    -- Get user interaction metrics
    interaction_metrics AS (
      SELECT 
        metric_data->>'eventType' as event_type,
        metric_data->>'targetElement' as target_element,
        (metric_data->>'duration')::FLOAT as duration
      FROM frontend_performance_logs
      WHERE 
        metric_type = 'user_interaction' AND
        created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
    ),
    
    -- Get form submission metrics
    form_metrics AS (
      SELECT 
        metric_data->>'formId' as form_id,
        (metric_data->>'totalTime')::FLOAT as total_time,
        (metric_data->>'success')::BOOLEAN as success
      FROM frontend_performance_logs
      WHERE 
        metric_type = 'form_submission' AND
        created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
    ),
    
    -- Calculate average metrics
    avg_metrics AS (
      SELECT
        COALESCE(AVG(load_time), 0) as avg_page_load_time,
        COALESCE(AVG(first_contentful_paint), 0) as avg_first_contentful_paint,
        COALESCE(AVG(time_to_interactive), 0) as avg_time_to_interactive
      FROM page_load_metrics
    ),
    
    -- Get slowest components
    slowest_components AS (
      SELECT 
        component_name,
        route,
        render_time,
        rerenders
      FROM component_metrics
      ORDER BY render_time DESC
      LIMIT 10
    ),
    
    -- Get slowest network requests
    slowest_requests AS (
      SELECT 
        url,
        route,
        method,
        duration,
        status,
        resource_type
      FROM network_metrics
      WHERE status < 400  -- Exclude error responses
      ORDER BY duration DESC
      LIMIT 10
    )
    
  -- Construct the final report
  SELECT json_build_object(
    'avgPageLoadTime', COALESCE((SELECT avg_page_load_time FROM avg_metrics), 0),
    'avgFirstContentfulPaint', COALESCE((SELECT avg_first_contentful_paint FROM avg_metrics), 0),
    'avgTimeToInteractive', COALESCE((SELECT avg_time_to_interactive FROM avg_metrics), 0),
    'avgNetworkRequestTime', COALESCE((SELECT AVG(duration) FROM network_metrics WHERE status < 400), 0),
    'slowestNetworkRequests', COALESCE((SELECT json_agg(row_to_json(r)) FROM slowest_requests r), '[]'::json),
    'slowestComponents', COALESCE((SELECT json_agg(row_to_json(c)) FROM slowest_components c), '[]'::json),
    'avgFormSubmissionTime', COALESCE((SELECT AVG(total_time) FROM form_metrics WHERE success = true), 0),
    'avgUserInteractionTime', COALESCE((SELECT AVG(duration) FROM interaction_metrics), 0)
  ) INTO report;
  
  RETURN report;
END;
$$ LANGUAGE plpgsql;

-- Function to get detailed page performance metrics
CREATE OR REPLACE FUNCTION get_page_performance_metrics(
  page_path TEXT,
  from_time TEXT,
  to_time TEXT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pageLoads', COALESCE(
      (SELECT json_agg(row_to_json(pl)) 
       FROM (
         SELECT 
           metric_data->>'route' as route,
           (metric_data->>'loadTime')::FLOAT as loadTime,
           (metric_data->>'domContentLoaded')::FLOAT as domContentLoaded,
           (metric_data->>'firstPaint')::FLOAT as firstPaint,
           (metric_data->>'firstContentfulPaint')::FLOAT as firstContentfulPaint,
           (metric_data->>'timeToInteractive')::FLOAT as timeToInteractive,
           (metric_data->>'largestContentfulPaint')::FLOAT as largestContentfulPaint,
           metric_data->>'timestamp' as timestamp,
           metric_data->>'userId' as userId,
           metric_data->>'userAgent' as userAgent,
           metric_data->>'connection' as connection,
           (metric_data->>'deviceMemory')::FLOAT as deviceMemory,
           metric_data->>'effectiveConnectionType' as effectiveConnectionType
         FROM frontend_performance_logs
         WHERE 
           metric_type = 'page_load' AND
           metric_data->>'route' = page_path AND
           created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
         ORDER BY created_at DESC
       ) pl
      ), '[]'::json
    ),
    
    'networkRequests', COALESCE(
      (SELECT json_agg(row_to_json(nr)) 
       FROM (
         SELECT 
           metric_data->>'url' as url,
           metric_data->>'route' as route,
           metric_data->>'method' as method,
           (metric_data->>'duration')::FLOAT as duration,
           (metric_data->>'status')::INT as status,
           (metric_data->>'requestSize')::INT as requestSize,
           (metric_data->>'responseSize')::INT as responseSize,
           metric_data->>'resourceType' as resourceType,
           (metric_data->>'cached')::BOOLEAN as cached,
           metric_data->>'timestamp' as timestamp,
           metric_data->>'userId' as userId
         FROM frontend_performance_logs
         WHERE 
           metric_type = 'network_request' AND
           metric_data->>'route' = page_path AND
           created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
         ORDER BY created_at DESC
       ) nr
      ), '[]'::json
    ),
    
    'componentRenders', COALESCE(
      (SELECT json_agg(row_to_json(cr)) 
       FROM (
         SELECT 
           metric_data->>'componentName' as componentName,
           metric_data->>'route' as route,
           (metric_data->>'renderTime')::FLOAT as renderTime,
           (metric_data->>'rerenders')::INT as rerenders,
           metric_data->>'timestamp' as timestamp,
           metric_data->>'userId' as userId
         FROM frontend_performance_logs
         WHERE 
           metric_type = 'component_render' AND
           metric_data->>'route' = page_path AND
           created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
         ORDER BY created_at DESC
       ) cr
      ), '[]'::json
    ),
    
    'userInteractions', COALESCE(
      (SELECT json_agg(row_to_json(ui)) 
       FROM (
         SELECT 
           metric_data->>'route' as route,
           metric_data->>'eventType' as eventType,
           metric_data->>'targetElement' as targetElement,
           (metric_data->>'duration')::FLOAT as duration,
           metric_data->>'timestamp' as timestamp,
           metric_data->>'userId' as userId
         FROM frontend_performance_logs
         WHERE 
           metric_type = 'user_interaction' AND
           metric_data->>'route' = page_path AND
           created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
         ORDER BY created_at DESC
       ) ui
      ), '[]'::json
    ),
    
    'formSubmissions', COALESCE(
      (SELECT json_agg(row_to_json(fs)) 
       FROM (
         SELECT 
           metric_data->>'formId' as formId,
           metric_data->>'route' as route,
           (metric_data->>'preparationTime')::FLOAT as preparationTime,
           (metric_data->>'validationTime')::FLOAT as validationTime,
           (metric_data->>'submissionTime')::FLOAT as submissionTime,
           (metric_data->>'totalTime')::FLOAT as totalTime,
           (metric_data->>'success')::BOOLEAN as success,
           (metric_data->>'fieldCount')::INT as fieldCount,
           metric_data->>'timestamp' as timestamp,
           metric_data->>'userId' as userId
         FROM frontend_performance_logs
         WHERE 
           metric_type = 'form_submission' AND
           metric_data->>'route' = page_path AND
           created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
         ORDER BY created_at DESC
       ) fs
      ), '[]'::json
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql; 