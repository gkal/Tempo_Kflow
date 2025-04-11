/**
 * Database Performance Monitoring Service
 * 
 * This service provides functionality to monitor database performance metrics,
 * analyze query patterns, track slow queries, and generate optimization suggestions.
 * It integrates with Supabase and provides real-time insights into database performance.
 */

import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';

// Types for performance monitoring
export interface QueryPerformanceData {
  query: string;
  executionTime: number;
  timestamp: string;
  parameters?: Record<string, any>;
  rowsAffected?: number;
  source?: string;
  user?: string;
  success: boolean;
  error?: string;
}

export interface QueryStats {
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  totalExecutions: number;
  failureRate: number;
  commonParameters?: string[];
}

export interface TableStatistics {
  tableName: string;
  rowCount: number;
  estimatedSize: string;
  lastAnalyzed?: string;
  indexUsage?: Record<string, number>;
}

export interface OptimizationSuggestion {
  type: 'index' | 'query' | 'table' | 'transaction' | 'configuration';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  rationale: string;
  potentialImprovement: string;
  implementation?: string;
  affectedQueries?: string[];
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  maxConnections: number;
  utilizationPercentage: number;
}

/**
 * Database Performance Service for monitoring and optimizing database performance
 */
export const DatabasePerformanceService = {
  /**
   * Records query performance data to the monitoring table
   * @param queryData Query performance data to record
   * @returns True if the data was successfully recorded
   */
  async recordQueryPerformance(queryData: QueryPerformanceData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('query_performance_logs')
        .insert({
          query: queryData.query,
          execution_time_ms: queryData.executionTime,
          executed_at: queryData.timestamp,
          parameters: queryData.parameters ? JSON.stringify(queryData.parameters) : null,
          rows_affected: queryData.rowsAffected,
          source: queryData.source,
          user_id: queryData.user,
          success: queryData.success,
          error_message: queryData.error
        });

      if (error) {
        console.error('Error recording query performance:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Exception recording query performance:', err);
      return false;
    }
  },

  /**
   * Gets performance statistics for a specific query or query pattern
   * @param queryPattern Query or query pattern to analyze
   * @param timeRange Optional time range for the analysis
   * @returns Statistics for the query
   */
  async getQueryStats(
    queryPattern: string,
    timeRange?: { from: string; to: string }
  ): Promise<QueryStats | null> {
    try {
      let query = supabase
        .from('query_performance_logs')
        .select('execution_time_ms, success, parameters')
        .ilike('query', `%${queryPattern}%`);

      if (timeRange) {
        query = query
          .gte('executed_at', timeRange.from)
          .lte('executed_at', timeRange.to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching query stats:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Calculate statistics
      const executionTimes = data.map(item => item.execution_time_ms);
      const failedQueries = data.filter(item => !item.success).length;
      const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
      
      return {
        averageExecutionTime: avgTime,
        minExecutionTime: Math.min(...executionTimes),
        maxExecutionTime: Math.max(...executionTimes),
        totalExecutions: data.length,
        failureRate: (failedQueries / data.length) * 100
      };
    } catch (err) {
      console.error('Exception getting query stats:', err);
      return null;
    }
  },

  /**
   * Identifies slow queries based on execution time
   * @param threshold Threshold in milliseconds to consider a query as slow
   * @param limit Maximum number of slow queries to return
   * @param timeRange Optional time range for the analysis
   * @returns List of slow queries with their statistics
   */
  async identifySlowQueries(
    threshold: number = 500,
    limit: number = 10,
    timeRange?: { from: string; to: string }
  ): Promise<{ query: string; stats: QueryStats }[]> {
    try {
      let baseQuery = supabase
        .from('query_performance_logs')
        .select('query, execution_time_ms, success')
        .gte('execution_time_ms', threshold);

      if (timeRange) {
        baseQuery = baseQuery
          .gte('executed_at', timeRange.from)
          .lte('executed_at', timeRange.to);
      }

      const { data, error } = await baseQuery;

      if (error) {
        console.error('Error identifying slow queries:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by normalized query pattern
      const queryGroups: Record<string, number[]> = {};
      const querySuccessMap: Record<string, boolean[]> = {};

      for (const record of data) {
        // Normalize the query by removing specific values
        const normalizedQuery = this.normalizeQuery(record.query);
        
        if (!queryGroups[normalizedQuery]) {
          queryGroups[normalizedQuery] = [];
          querySuccessMap[normalizedQuery] = [];
        }
        
        queryGroups[normalizedQuery].push(record.execution_time_ms);
        querySuccessMap[normalizedQuery].push(record.success);
      }

      // Calculate statistics for each query pattern
      const queryStats = Object.entries(queryGroups).map(([query, times]) => {
        const successes = querySuccessMap[query] || [];
        const failedQueries = successes.filter(s => !s).length;
        
        return {
          query,
          stats: {
            averageExecutionTime: times.reduce((sum, time) => sum + time, 0) / times.length,
            minExecutionTime: Math.min(...times),
            maxExecutionTime: Math.max(...times),
            totalExecutions: times.length,
            failureRate: (failedQueries / successes.length) * 100
          }
        };
      });

      // Sort by average execution time (descending) and limit results
      return queryStats
        .sort((a, b) => b.stats.averageExecutionTime - a.stats.averageExecutionTime)
        .slice(0, limit);
    } catch (err) {
      console.error('Exception identifying slow queries:', err);
      return [];
    }
  },

  /**
   * Gets statistics about database tables
   * @returns Statistics for all database tables
   */
  async getTableStatistics(): Promise<TableStatistics[]> {
    try {
      // This requires access to postgres system catalogs, which might be restricted in some Supabase projects
      // If restricted, this would need to be implemented via a custom RPC function or API
      const { data, error } = await supabase.rpc('get_table_statistics');

      if (error) {
        console.error('Error getting table statistics:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Exception getting table statistics:', err);
      return [];
    }
  },

  /**
   * Gets current connection pool statistics
   * @returns Connection pool statistics
   */
  async getConnectionPoolStats(): Promise<ConnectionPoolStats | null> {
    try {
      // This requires access to postgres system catalogs, which might be restricted in some Supabase projects
      // If restricted, this would need to be implemented via a custom RPC function or API
      const { data, error } = await supabase.rpc('get_connection_pool_stats');

      if (error) {
        console.error('Error getting connection pool stats:', error);
        return null;
      }

      return data || null;
    } catch (err) {
      console.error('Exception getting connection pool stats:', err);
      return null;
    }
  },

  /**
   * Generates optimization suggestions for database performance improvement
   * @returns List of optimization suggestions
   */
  async generateOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    try {
      const suggestions: OptimizationSuggestion[] = [];
      
      // Get data needed for analysis
      const slowQueries = await this.identifySlowQueries(300, 50);
      const tableStats = await this.getTableStatistics();
      const queryPatterns = await this.getCommonQueryPatterns();
      
      // Analyze missing indexes based on slow queries
      const indexSuggestions = await this.analyzeMissingIndexes(slowQueries.map(q => q.query));
      suggestions.push(...indexSuggestions);
      
      // Check for potentially unoptimized queries (high execution time variance)
      for (const { query, stats } of slowQueries) {
        if (stats.maxExecutionTime > stats.averageExecutionTime * 5) {
          suggestions.push({
            type: 'query',
            priority: 'high',
            suggestion: 'Consider optimizing query with inconsistent performance',
            rationale: `Query has high variance in execution time (avg: ${stats.averageExecutionTime.toFixed(2)}ms, max: ${stats.maxExecutionTime.toFixed(2)}ms)`,
            potentialImprovement: 'Could reduce maximum execution time by 80%',
            implementation: 'Analyze query plan and optimize or add appropriate indexes',
            affectedQueries: [query]
          });
        }
      }
      
      // Check for tables without regular analysis
      for (const table of tableStats) {
        if (!table.lastAnalyzed || new Date(table.lastAnalyzed).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) {
          suggestions.push({
            type: 'table',
            priority: 'medium',
            suggestion: `Run ANALYZE on table ${table.tableName}`,
            rationale: 'Table statistics are outdated or missing',
            potentialImprovement: 'Could improve query planning and execution time',
            implementation: `ANALYZE ${table.tableName};`
          });
        }
      }
      
      // Suggest specific optimizations for common query patterns
      for (const pattern of queryPatterns) {
        if (pattern.includes('NOT IN') || pattern.includes('NOT EXISTS')) {
          suggestions.push({
            type: 'query',
            priority: 'medium',
            suggestion: 'Replace NOT IN/NOT EXISTS with LEFT JOIN WHERE IS NULL',
            rationale: 'NOT IN and NOT EXISTS can be inefficient in some databases',
            potentialImprovement: 'Could improve execution time up to 30-50%',
            affectedQueries: [pattern]
          });
        }
        
        if (pattern.includes('LIKE') && !pattern.includes('LIKE') && !pattern.includes('_')) {
          suggestions.push({
            type: 'query',
            priority: 'low',
            suggestion: 'Consider using = instead of LIKE for exact matches',
            rationale: 'LIKE without wildcards is less efficient than direct equality',
            potentialImprovement: 'Small performance improvement for exact matching',
            affectedQueries: [pattern]
          });
        }
      }
      
      // Suggest connection pool optimizations if needed
      const poolStats = await this.getConnectionPoolStats();
      if (poolStats && poolStats.utilizationPercentage > 90) {
        suggestions.push({
          type: 'configuration',
          priority: 'high',
          suggestion: 'Increase connection pool size',
          rationale: `Connection pool utilization is very high (${poolStats.utilizationPercentage.toFixed(1)}%)`,
          potentialImprovement: 'Will reduce connection wait times and potential timeouts',
          implementation: 'Review and increase pgbouncer max_client_conn setting'
        });
      }
      
      return suggestions;
    } catch (err) {
      console.error('Exception generating optimization suggestions:', err);
      return [];
    }
  },
  
  /**
   * Analyzes query execution plans to identify potential index improvements
   * @param queries List of queries to analyze
   * @returns Index optimization suggestions
   */
  async analyzeMissingIndexes(queries: string[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    
    try {
      // This would require access to run EXPLAIN on queries, which might be restricted
      // For Supabase, this would typically be implemented as a server-side function
      
      // For demonstration purposes, let's implement some pattern matching logic
      // to identify potential missing indexes based on query patterns
      
      for (const query of queries) {
        // Check for WHERE clauses on non-indexed columns
        const whereMatches = query.match(/WHERE\s+(\w+\.\w+|\w+)\s*=/gi);
        if (whereMatches) {
          for (const match of whereMatches) {
            const column = match.replace(/WHERE\s+/i, '').replace(/\s*=.*$/, '');
            // Assume columns containing 'id', 'uuid', or ending with '_id' should be indexed
            if (!/id|uuid/i.test(column) && !column.endsWith('_id')) {
              suggestions.push({
                type: 'index',
                priority: 'medium',
                suggestion: `Consider adding an index on ${column}`,
                rationale: 'Column appears in WHERE clause but may not be indexed',
                potentialImprovement: 'Could significantly speed up queries filtering on this column',
                implementation: `CREATE INDEX idx_${column.replace('.', '_')} ON ${column.includes('.') ? column.split('.')[0] : 'table_name'} (${column.includes('.') ? column.split('.')[1] : column});`,
                affectedQueries: [query]
              });
            }
          }
        }
        
        // Check for potential full table scans on large tables with ORDER BY
        if (/FROM\s+(\w+)\s+.*ORDER BY/i.test(query)) {
          const match = query.match(/FROM\s+(\w+)\s+.*ORDER BY\s+([^)]+)(\)|$)/i);
          if (match) {
            const table = match[1];
            const orderColumn = match[2].trim().split(/\s+/)[0]; // Get column name without ASC/DESC
            
            suggestions.push({
              type: 'index',
              priority: 'medium',
              suggestion: `Consider adding an index for ORDER BY on ${orderColumn}`,
              rationale: 'Queries sorting by this column might cause full table scans',
              potentialImprovement: 'Could greatly improve sorting operations',
              implementation: `CREATE INDEX idx_${table}_${orderColumn} ON ${table} (${orderColumn});`,
              affectedQueries: [query]
            });
          }
        }
        
        // Check for joins on potentially non-indexed columns
        const joinMatches = query.match(/JOIN\s+(\w+)\s+ON\s+(\w+\.\w+)\s*=\s*(\w+\.\w+)/gi);
        if (joinMatches) {
          for (const match of joinMatches) {
            const parts = match.match(/JOIN\s+(\w+)\s+ON\s+(\w+\.\w+)\s*=\s*(\w+\.\w+)/i);
            if (parts) {
              const joinTable = parts[1];
              const joinColumns = [parts[2], parts[3]];
              
              for (const column of joinColumns) {
                if (column.startsWith(joinTable) && !/id|uuid/i.test(column) && !column.endsWith('_id')) {
                  suggestions.push({
                    type: 'index',
                    priority: 'high',
                    suggestion: `Add index on join column ${column}`,
                    rationale: 'Join operations on non-indexed columns can be very slow',
                    potentialImprovement: 'Could dramatically improve join performance',
                    implementation: `CREATE INDEX idx_${column.replace('.', '_')} ON ${column.split('.')[0]} (${column.split('.')[1]});`,
                    affectedQueries: [query]
                  });
                }
              }
            }
          }
        }
      }
      
      return suggestions;
    } catch (err) {
      console.error('Exception analyzing missing indexes:', err);
      return suggestions;
    }
  },
  
  /**
   * Extracts common query patterns from the query logs
   * @returns List of common query patterns
   */
  async getCommonQueryPatterns(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('query_performance_logs')
        .select('query')
        .order('executed_at', { ascending: false })
        .limit(1000);
        
      if (error) {
        console.error('Error getting query patterns:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Extract and normalize query patterns
      const patterns = data.map(record => this.normalizeQuery(record.query));
      
      // Count occurrences of each pattern
      const patternCounts: Record<string, number> = {};
      for (const pattern of patterns) {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
      
      // Return patterns sorted by frequency (most common first)
      return Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([pattern]) => pattern)
        .slice(0, 20); // Limit to top 20 patterns
    } catch (err) {
      console.error('Exception getting common query patterns:', err);
      return [];
    }
  },
  
  /**
   * Normalizes a SQL query by removing specific values
   * @param query SQL query to normalize
   * @returns Normalized query pattern
   */
  normalizeQuery(query: string): string {
    // Replace string literals
    let normalized = query.replace(/'[^']*'/g, "'?'");
    
    // Replace numeric literals
    normalized = normalized.replace(/\b\d+\b/g, '?');
    
    // Replace UUIDs
    normalized = normalized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '?');
    
    // Replace parameter placeholders
    normalized = normalized.replace(/\$\d+/g, '$?');
    
    return normalized;
  },
  
  /**
   * Creates monitoring schema and tables if they don't exist
   * @returns True if the setup was successful
   */
  async setupMonitoringSchema(): Promise<boolean> {
    try {
      // Create the query performance logging table
      const createTable = `
        CREATE TABLE IF NOT EXISTS query_performance_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          query TEXT NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          parameters TEXT NULL,
          rows_affected INTEGER NULL,
          source TEXT NULL,
          user_id UUID NULL,
          success BOOLEAN NOT NULL,
          error_message TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes for faster querying
        CREATE INDEX IF NOT EXISTS idx_query_perf_logs_executed_at ON query_performance_logs(executed_at);
        CREATE INDEX IF NOT EXISTS idx_query_perf_logs_exec_time ON query_performance_logs(execution_time_ms);
        CREATE INDEX IF NOT EXISTS idx_query_perf_logs_success ON query_performance_logs(success);
        CREATE INDEX IF NOT EXISTS idx_query_perf_logs_user_id ON query_performance_logs(user_id);
      `;
      
      // Create RPC function for table statistics
      const createTableStatsFunc = `
        CREATE OR REPLACE FUNCTION get_table_statistics()
        RETURNS TABLE (
          table_name TEXT,
          row_count BIGINT,
          estimated_size TEXT,
          last_analyzed TIMESTAMPTZ
        )
        LANGUAGE sql
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
      `;
      
      // Create RPC function for connection pool stats
      const createPoolStatsFunc = `
        CREATE OR REPLACE FUNCTION get_connection_pool_stats()
        RETURNS TABLE (
          total_connections INT,
          active_connections INT,
          idle_connections INT,
          max_connections INT,
          utilization_percentage NUMERIC
        )
        LANGUAGE sql
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
      `;
      
      // Execute the table creation SQL
      const { error: tableError } = await supabase.rpc('run_sql_query', {
        query: createTable
      });
      
      if (tableError) {
        console.error('Error creating monitoring tables:', tableError);
        return false;
      }
      
      // Execute the function creation SQL
      const { error: funcError1 } = await supabase.rpc('run_sql_query', {
        query: createTableStatsFunc
      });
      
      if (funcError1) {
        console.error('Error creating table stats function:', funcError1);
        return false;
      }
      
      const { error: funcError2 } = await supabase.rpc('run_sql_query', {
        query: createPoolStatsFunc
      });
      
      if (funcError2) {
        console.error('Error creating pool stats function:', funcError2);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Exception setting up monitoring schema:', err);
      return false;
    }
  }
};

/**
 * A higher-order function that wraps a database query to measure and record its performance
 * @param queryFn The database query function to wrap
 * @param queryName A descriptive name for the query
 * @param source The source of the query (e.g., component name)
 * @returns A wrapped function that measures and records query performance
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  queryFn: T,
  queryName: string,
  source?: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now();
    let success = false;
    let error: Error | null = null;
    let result: any;
    
    try {
      result = await queryFn(...args);
      success = true;
      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Record performance metrics asynchronously without blocking
      DatabasePerformanceService.recordQueryPerformance({
        query: queryName,
        executionTime,
        timestamp: new Date().toISOString(),
        parameters: args.length > 0 ? { args } : undefined,
        rowsAffected: result?.data?.length,
        source,
        success,
        error: error?.message
      }).catch(err => {
        console.error('Failed to record query performance:', err);
      });
    }
  }) as T;
}

export default DatabasePerformanceService; 