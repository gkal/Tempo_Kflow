-- Create query performance monitoring tables and functions
-- This migration sets up the database schema for tracking query performance
-- and generating optimization suggestions.

-- Create the query performance logs table to store query execution data
CREATE TABLE IF NOT EXISTS query_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parameters TEXT NULL,
  rows_affected INTEGER NULL,
  source TEXT NULL,
  user_id UUID NULL REFERENCES users(id),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ NULL
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_query_perf_logs_executed_at ON query_performance_logs(executed_at);
CREATE INDEX IF NOT EXISTS idx_query_perf_logs_exec_time ON query_performance_logs(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_query_perf_logs_success ON query_performance_logs(success);
CREATE INDEX IF NOT EXISTS idx_query_perf_logs_user_id ON query_performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_perf_logs_deleted_at ON query_performance_logs(deleted_at);

-- Create function to get table statistics
CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  estimated_size TEXT,
  last_analyzed TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    relname AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(c.oid)) AS estimated_size,
    last_analyze AS last_analyzed
  FROM
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_stat_user_tables s ON s.relname = c.relname
  WHERE
    c.relkind = 'r'
    AND n.nspname = 'public'
  ORDER BY
    n_live_tup DESC;
$$;

-- Create function to get connection pool statistics
CREATE OR REPLACE FUNCTION get_connection_pool_stats()
RETURNS TABLE (
  total_connections INT,
  active_connections INT,
  idle_connections INT,
  max_connections INT,
  utilization_percentage NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH conn_count AS (
    SELECT count(*) as total_conn
    FROM pg_stat_activity
  ),
  active_count AS (
    SELECT count(*) as active_conn
    FROM pg_stat_activity
    WHERE state = 'active' AND pid <> pg_backend_pid()
  ),
  max_conn AS (
    SELECT setting::int as max_conn
    FROM pg_settings
    WHERE name = 'max_connections'
  )
  SELECT
    (SELECT total_conn FROM conn_count) as total_connections,
    (SELECT active_conn FROM active_count) as active_connections,
    (SELECT total_conn FROM conn_count) - (SELECT active_conn FROM active_count) as idle_connections,
    (SELECT max_conn FROM max_conn) as max_connections,
    (SELECT total_conn::numeric / max_conn * 100 FROM conn_count, max_conn) as utilization_percentage;
$$;

-- Create function to analyze query patterns and suggest optimizations
CREATE OR REPLACE FUNCTION analyze_query_patterns(
  slow_query_threshold_ms INTEGER DEFAULT 500,
  max_queries INTEGER DEFAULT 100
)
RETURNS TABLE (
  query_pattern TEXT,
  avg_execution_time NUMERIC,
  max_execution_time NUMERIC,
  execution_count INTEGER,
  suggestion TEXT,
  priority TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH SlowQueries AS (
    SELECT 
      query,
      avg(execution_time_ms) as avg_time,
      max(execution_time_ms) as max_time,
      count(*) as execution_count
    FROM query_performance_logs
    WHERE 
      execution_time_ms >= slow_query_threshold_ms
      AND success = true
      AND is_deleted = false
    GROUP BY query
    ORDER BY avg_time DESC
    LIMIT max_queries
  )
  SELECT
    query as query_pattern,
    avg_time as avg_execution_time,
    max_time as max_execution_time,
    execution_count,
    CASE
      WHEN query ~* 'WHERE.*NOT\s+IN' THEN 'Consider using LEFT JOIN WHERE IS NULL instead of NOT IN'
      WHEN query ~* 'SELECT\s+\*' THEN 'Specify exact columns instead of using SELECT *'
      WHEN query ~* 'ORDER\s+BY' AND max_time > 1000 THEN 'Consider adding an index for the ORDER BY column'
      WHEN query ~* 'LIKE.*%.*%' THEN 'The LIKE pattern with leading wildcard prevents index usage'
      WHEN max_time > avg_time * 5 THEN 'Query has high variance, check for parameter sniffing issues'
      ELSE 'Review query execution plan with EXPLAIN ANALYZE'
    END as suggestion,
    CASE
      WHEN max_time > 5000 THEN 'high'
      WHEN max_time > 1000 THEN 'medium'
      ELSE 'low'
    END as priority
  FROM SlowQueries
  ORDER BY avg_time DESC;
$$;

-- Create function to identify missing indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  suggested_index TEXT,
  reason TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  WITH TableSizes AS (
    SELECT 
      relname as table_name,
      n_live_tup as row_count
    FROM pg_stat_user_tables
    WHERE n_live_tup > 1000
  ),
  
  QueryPatterns AS (
    SELECT 
      query,
      count(*) as query_count
    FROM query_performance_logs
    WHERE execution_time_ms > 300
    AND success = true
    AND is_deleted = false
    GROUP BY query
    HAVING count(*) > 5
  ),
  
  WhereColumns AS (
    SELECT 
      substring(query from 'FROM\s+([a-zA-Z_]+)') as table_name,
      regexp_matches(query, 'WHERE\s+([a-zA-Z_.]+)\s*=', 'g') as where_column
    FROM QueryPatterns
  )
  
  SELECT 
    t.table_name,
    wc.where_column[1] as column_name,
    'CREATE INDEX idx_' || replace(wc.where_column[1], '.', '_') || ' ON ' || 
      coalesce(substring(wc.where_column[1] from '([a-zA-Z_]+)\.'), t.table_name || '.') || 
      coalesce(substring(wc.where_column[1] from '\.([a-zA-Z_]+)'), wc.where_column[1]) || ');' as suggested_index,
    'Column appears in WHERE clauses but may not be indexed' as reason
  FROM TableSizes t
  JOIN WhereColumns wc ON wc.table_name = t.table_name
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = t.table_name
    AND indexdef ~* wc.where_column[1]
  )
  GROUP BY t.table_name, wc.where_column[1]
  ORDER BY t.row_count DESC;
$$;

-- Create trigger to update query_performance_logs.updated_at
CREATE OR REPLACE FUNCTION update_query_performance_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_query_performance_logs_timestamp
BEFORE UPDATE ON query_performance_logs
FOR EACH ROW
EXECUTE FUNCTION update_query_performance_logs_timestamp();

-- Permissions: enable RLS and create policies
ALTER TABLE query_performance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: only allow users to see their own queries unless they are admins
CREATE POLICY query_logs_select_policy ON query_performance_logs
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy: only allow admins to create query logs
CREATE POLICY query_logs_insert_policy ON query_performance_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

-- Policy: only allow admins to update query logs
CREATE POLICY query_logs_update_policy ON query_performance_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

-- Policy: Only allow soft delete (never hard delete)
CREATE POLICY query_logs_delete_policy ON query_performance_logs
  FOR DELETE USING (false); -- Prevent any hard deletes

-- Create function to reset and start monitoring
CREATE OR REPLACE FUNCTION reset_and_start_monitoring()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_count INTEGER;
BEGIN
  -- Check if we have permissions to access system tables
  BEGIN
    SELECT count(*) INTO table_count FROM pg_stat_user_tables;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN 'Insufficient privileges to access system tables. Some monitoring features will be limited.';
  END;
  
  -- Clean up old logs if requested (keeping the last 30 days)
  UPDATE query_performance_logs 
  SET is_deleted = true, deleted_at = NOW()
  WHERE executed_at < NOW() - INTERVAL '30 days'
  AND is_deleted = false;
  
  -- Analyze tables to get updated statistics
  ANALYZE;
  
  RETURN 'Monitoring reset completed. System is ready for performance tracking.';
END;
$$; 