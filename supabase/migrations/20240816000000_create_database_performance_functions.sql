-- Create database performance monitoring schema and functions

-- Function to set up required tables for database performance monitoring
CREATE OR REPLACE FUNCTION setup_database_monitoring_schema()
RETURNS void AS $$
BEGIN
  -- Create query_performance_logs table if it doesn't exist
  CREATE TABLE IF NOT EXISTS query_performance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    row_count INTEGER DEFAULT 0,
    user_id UUID,
    source TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    query_params JSONB,
    query_plan JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- Create connection_pool_logs table if it doesn't exist
  CREATE TABLE IF NOT EXISTS connection_pool_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_connections INTEGER NOT NULL,
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    waiting_connections INTEGER NOT NULL DEFAULT 0,
    max_connections INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- Create transaction_performance_logs table if it doesn't exist
  CREATE TABLE IF NOT EXISTS transaction_performance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER NOT NULL,
    operations_count INTEGER NOT NULL DEFAULT 1,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    isolation_level TEXT,
    user_id UUID,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- Create table_metrics_logs table if it doesn't exist
  CREATE TABLE IF NOT EXISTS table_metrics_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    row_count BIGINT NOT NULL,
    table_size_bytes BIGINT NOT NULL,
    index_size_bytes BIGINT NOT NULL,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- Create index_usage_logs table if it doesn't exist
  CREATE TABLE IF NOT EXISTS index_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    index_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    index_size_bytes BIGINT NOT NULL,
    scans BIGINT NOT NULL,
    tuples_read BIGINT NOT NULL,
    tuples_fetched BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- Create indexes for faster queries
  CREATE INDEX IF NOT EXISTS idx_query_perf_logs_created_at 
    ON query_performance_logs (created_at);
  
  CREATE INDEX IF NOT EXISTS idx_query_perf_logs_execution_time 
    ON query_performance_logs (execution_time_ms);
  
  CREATE INDEX IF NOT EXISTS idx_query_perf_logs_source 
    ON query_performance_logs (source);
  
  CREATE INDEX IF NOT EXISTS idx_connection_pool_logs_created_at 
    ON connection_pool_logs (created_at);
  
  CREATE INDEX IF NOT EXISTS idx_transaction_perf_logs_created_at 
    ON transaction_performance_logs (created_at);
  
  CREATE INDEX IF NOT EXISTS idx_transaction_perf_logs_duration 
    ON transaction_performance_logs (duration_ms);
  
  CREATE INDEX IF NOT EXISTS idx_table_metrics_logs_table_name 
    ON table_metrics_logs (table_name);
  
  CREATE INDEX IF NOT EXISTS idx_table_metrics_logs_created_at 
    ON table_metrics_logs (created_at);
  
  CREATE INDEX IF NOT EXISTS idx_index_usage_logs_table_name 
    ON index_usage_logs (table_name);
  
  CREATE INDEX IF NOT EXISTS idx_index_usage_logs_scans 
    ON index_usage_logs (scans);
END;
$$ LANGUAGE plpgsql;

-- Function to collect current database statistics and store them
CREATE OR REPLACE FUNCTION collect_database_statistics()
RETURNS void AS $$
BEGIN
  -- Collect table statistics
  INSERT INTO table_metrics_logs (
    table_name,
    row_count,
    table_size_bytes,
    index_size_bytes,
    last_vacuum,
    last_analyze
  )
  SELECT
    n.nspname || '.' || c.relname AS table_name,
    COALESCE(s.n_live_tup, 0) AS row_count,
    COALESCE(pg_total_relation_size(c.oid) - pg_indexes_size(c.oid), 0) AS table_size_bytes,
    COALESCE(pg_indexes_size(c.oid), 0) AS index_size_bytes,
    s.last_vacuum,
    s.last_analyze
  FROM
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
  WHERE
    c.relkind = 'r' AND
    n.nspname NOT IN ('pg_catalog', 'information_schema') AND
    n.nspname = 'public';

  -- Collect index usage statistics
  INSERT INTO index_usage_logs (
    index_name,
    table_name,
    index_size_bytes,
    scans,
    tuples_read,
    tuples_fetched
  )
  SELECT
    i.indexrelname AS index_name,
    n.nspname || '.' || t.relname AS table_name,
    pg_relation_size(i.indexrelid) AS index_size_bytes,
    i.idx_scan AS scans,
    i.idx_tup_read AS tuples_read,
    i.idx_tup_fetch AS tuples_fetched
  FROM
    pg_stat_user_indexes i
    JOIN pg_class t ON i.relid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE
    n.nspname NOT IN ('pg_catalog', 'information_schema') AND
    n.nspname = 'public';

  -- Collect connection pool statistics
  INSERT INTO connection_pool_logs (
    total_connections,
    active_connections,
    idle_connections,
    waiting_connections,
    max_connections
  )
  SELECT
    COUNT(*) AS total_connections,
    COUNT(*) FILTER (WHERE state = 'active') AS active_connections,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle_connections,
    0 AS waiting_connections, -- Not easily available in standard PostgreSQL
    current_setting('max_connections')::int AS max_connections
  FROM
    pg_stat_activity
  WHERE
    datname = current_database();
END;
$$ LANGUAGE plpgsql;

-- Function to generate database performance report
CREATE OR REPLACE FUNCTION get_database_performance_report(
  from_time TEXT,
  to_time TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  avg_query_time FLOAT;
  query_percentiles JSONB;
  connection_utilization FLOAT;
  avg_transaction_time FLOAT;
  transaction_success_rate FLOAT;
  db_size BIGINT;
BEGIN
  -- Calculate average query time
  SELECT AVG(execution_time_ms) INTO avg_query_time
  FROM query_performance_logs
  WHERE created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE;

  -- Calculate query time percentiles (50th, 90th, 95th, 99th)
  WITH percentiles AS (
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY execution_time_ms) AS p50,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY execution_time_ms) AS p90,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY execution_time_ms) AS p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY execution_time_ms) AS p99
    FROM query_performance_logs
    WHERE created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
  )
  SELECT jsonb_build_object(
    'p50', p50,
    'p90', p90,
    'p95', p95,
    'p99', p99
  ) INTO query_percentiles
  FROM percentiles;

  -- Calculate connection pool utilization (average)
  SELECT AVG(active_connections::FLOAT / NULLIF(max_connections, 0)) * 100 INTO connection_utilization
  FROM connection_pool_logs
  WHERE created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE;

  -- Calculate average transaction time
  SELECT AVG(duration_ms) INTO avg_transaction_time
  FROM transaction_performance_logs
  WHERE created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE;

  -- Calculate transaction success rate
  SELECT
    COALESCE(
      SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100,
      100
    ) INTO transaction_success_rate
  FROM transaction_performance_logs
  WHERE created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE;

  -- Calculate total database size
  WITH latest_metrics AS (
    SELECT DISTINCT ON (table_name)
      table_name,
      table_size_bytes + index_size_bytes AS total_size
    FROM table_metrics_logs
    WHERE created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
    ORDER BY table_name, created_at DESC
  )
  SELECT COALESCE(SUM(total_size), 0) INTO db_size
  FROM latest_metrics;

  -- Construct the final report
  SELECT jsonb_build_object(
    'slowestQueries', (
      SELECT jsonb_agg(q.*)
      FROM (
        SELECT
          id AS "queryId",
          query,
          execution_time_ms AS "executionTime",
          row_count AS "rowCount",
          user_id AS "userId",
          source,
          created_at AS "timestamp",
          success,
          error_message AS "errorMessage",
          query_params AS "queryParams",
          query_plan AS "queryPlan"
        FROM query_performance_logs
        WHERE created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
        ORDER BY execution_time_ms DESC
        LIMIT 10
      ) q
    ),
    'avgQueryTime', COALESCE(avg_query_time, 0),
    'queryTimePercentiles', COALESCE(query_percentiles, '{}'::jsonb),
    'connectionPoolUtilization', COALESCE(connection_utilization, 0),
    'avgTransactionTime', COALESCE(avg_transaction_time, 0),
    'transactionSuccess', COALESCE(transaction_success_rate, 100),
    'largestTables', (
      SELECT jsonb_agg(t.*)
      FROM (
        SELECT DISTINCT ON (table_name)
          table_name AS "tableName",
          row_count AS "rowCount",
          table_size_bytes AS "tableSize",
          index_size_bytes AS "indexSize",
          last_vacuum AS "lastVacuum",
          last_analyze AS "lastAnalyze",
          created_at AS "timestamp"
        FROM table_metrics_logs
        WHERE created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE
        ORDER BY table_name, created_at DESC
      ) t
      ORDER BY t."tableSize" DESC
      LIMIT 10
    ),
    'totalDatabaseSize', db_size,
    'unusedIndexes', (
      SELECT jsonb_agg(i.*)
      FROM (
        SELECT DISTINCT ON (index_name)
          index_name AS "indexName",
          table_name AS "tableName",
          index_size_bytes AS "indexSize",
          scans,
          tuples_read AS "tupleReads",
          tuples_fetched AS "tuplesFetched",
          created_at AS "timestamp"
        FROM index_usage_logs
        WHERE 
          created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE AND
          scans = 0 AND 
          index_size_bytes > 1048576 -- Larger than 1MB
        ORDER BY index_name, created_at DESC
      ) i
      LIMIT 10
    ),
    'inefficientQueries', (
      SELECT jsonb_agg(iq.*)
      FROM (
        SELECT
          id AS "queryId",
          query,
          execution_time_ms AS "executionTime",
          row_count AS "rowCount",
          user_id AS "userId",
          source,
          created_at AS "timestamp",
          success,
          error_message AS "errorMessage",
          query_params AS "queryParams",
          query_plan AS "queryPlan"
        FROM query_performance_logs
        WHERE 
          created_at BETWEEN from_time::TIMESTAMP WITH TIME ZONE AND to_time::TIMESTAMP WITH TIME ZONE AND
          execution_time_ms > 1000 AND -- Queries taking more than 1 second
          (
            query_plan IS NOT NULL AND 
            (
              query_plan::text LIKE '%Seq Scan%' OR
              query_plan::text LIKE '%Nested Loop%' OR
              query_plan::text LIKE '%Hash Join%'
            )
          )
        ORDER BY execution_time_ms DESC
        LIMIT 10
      ) iq
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate optimization suggestions for database performance
CREATE OR REPLACE FUNCTION get_database_optimization_suggestions()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH 
    -- Identify unused indexes
    unused_indexes AS (
      SELECT DISTINCT ON (index_name)
        index_name,
        table_name,
        index_size_bytes,
        scans
      FROM index_usage_logs
      WHERE 
        scans = 0 AND 
        index_size_bytes > 1048576 -- Larger than 1MB
      ORDER BY index_name, created_at DESC
    ),
    
    -- Identify tables that need VACUUM
    vacuum_candidates AS (
      SELECT DISTINCT ON (table_name)
        table_name,
        row_count,
        last_vacuum
      FROM table_metrics_logs
      WHERE 
        (last_vacuum IS NULL OR last_vacuum < now() - interval '7 days') AND
        row_count > 10000
      ORDER BY table_name, created_at DESC
    ),
    
    -- Identify connection pool issues
    connection_issues AS (
      SELECT 
        MAX(active_connections) AS max_active,
        MAX(max_connections) AS max_allowed,
        CASE 
          WHEN MAX(active_connections) > 0.8 * MAX(max_connections) THEN true
          ELSE false
        END AS has_issue
      FROM connection_pool_logs
      WHERE created_at > now() - interval '1 day'
    ),
    
    -- Identify inefficient queries
    inefficient_queries AS (
      SELECT
        id,
        query,
        execution_time_ms,
        row_count
      FROM query_performance_logs
      WHERE 
        created_at > now() - interval '7 days' AND
        execution_time_ms > 1000 AND
        query_plan IS NOT NULL AND
        (
          query_plan::text LIKE '%Seq Scan%' OR
          query_plan::text LIKE '%Nested Loop%' OR
          query_plan::text LIKE '%Hash Join%'
        )
      ORDER BY execution_time_ms DESC
      LIMIT 5
    )
    
  -- Build optimization suggestions
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', suggestion_type,
      'tableName', table_name,
      'description', description,
      'suggestion', suggestion,
      'priority', priority,
      'impact', impact,
      'currentMetric', current_metric,
      'targetMetric', target_metric,
      'query', query
    )
  )
  FROM (
    -- Unused index suggestions
    SELECT
      'index' AS suggestion_type,
      table_name,
      'Unused index consuming space' AS description,
      'Consider dropping unused index: ' || index_name AS suggestion,
      CASE
        WHEN index_size_bytes > 100 * 1024 * 1024 THEN 'high'
        WHEN index_size_bytes > 10 * 1024 * 1024 THEN 'medium'
        ELSE 'low'
      END AS priority,
      'Reduce database size and improve write performance' AS impact,
      index_size_bytes / (1024.0 * 1024.0) AS current_metric,
      0 AS target_metric,
      'DROP INDEX ' || index_name || ';' AS query
    FROM unused_indexes
    
    UNION ALL
    
    -- VACUUM suggestions
    SELECT
      'vacuum' AS suggestion_type,
      table_name,
      'Table needs VACUUM to reclaim space' AS description,
      'Run VACUUM ANALYZE on table ' || table_name AS suggestion,
      CASE
        WHEN last_vacuum IS NULL THEN 'high'
        WHEN last_vacuum < now() - interval '30 days' THEN 'high'
        WHEN last_vacuum < now() - interval '14 days' THEN 'medium'
        ELSE 'low'
      END AS priority,
      'Improve query planning and reclaim disk space' AS impact,
      EXTRACT(EPOCH FROM (now() - COALESCE(last_vacuum, now() - interval '90 days'))) / 86400 AS current_metric,
      7 AS target_metric,
      'VACUUM ANALYZE ' || table_name || ';' AS query
    FROM vacuum_candidates
    
    UNION ALL
    
    -- Connection pool suggestions
    SELECT
      'connection_pool' AS suggestion_type,
      NULL AS table_name,
      'High connection pool utilization' AS description,
      'Consider increasing max connections or implementing connection pooling' AS suggestion,
      CASE
        WHEN max_active > 0.9 * max_allowed THEN 'critical'
        WHEN max_active > 0.8 * max_allowed THEN 'high'
        ELSE 'medium'
      END AS priority,
      'Prevent connection timeouts and improve response times' AS impact,
      (max_active::float / max_allowed::float) * 100 AS current_metric,
      70 AS target_metric,
      NULL AS query
    FROM connection_issues
    WHERE has_issue
    
    UNION ALL
    
    -- Inefficient query suggestions
    SELECT
      'query' AS suggestion_type,
      NULL AS table_name,
      'Inefficient query with sequential scan' AS description,
      'Optimize query or add appropriate indexes' AS suggestion,
      CASE
        WHEN execution_time_ms > 5000 THEN 'critical'
        WHEN execution_time_ms > 2000 THEN 'high'
        ELSE 'medium'
      END AS priority,
      'Improve query response time' AS impact,
      execution_time_ms / 1000.0 AS current_metric,
      0.5 AS target_metric,
      substr(query, 1, 200) AS query
    FROM inefficient_queries
  ) suggestions
  INTO result;
  
  -- Provide default empty array if no suggestions
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql; 