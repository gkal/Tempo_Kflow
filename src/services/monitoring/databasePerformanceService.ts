/**
 * Database Performance Monitoring Service
 * 
 * This service provides functionality to monitor database performance metrics,
 * track query execution times, analyze connection pool utilization,
 * monitor transaction performance, and analyze database index usage.
 */

import { supabase } from '@/lib/supabaseClient';

// Types for database performance monitoring
export interface QueryPerformanceMetrics {
  queryId: string;
  query: string;
  executionTime: number;
  rowCount: number;
  userId?: string;
  source: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
  queryParams?: Record<string, any>;
  queryPlan?: any;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxConnections: number;
  timestamp: string;
}

export interface TransactionMetrics {
  transactionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  operations: number;
  success: boolean;
  errorMessage?: string;
  isolationLevel?: string;
  userId?: string;
  source: string;
}

export interface TableMetrics {
  tableName: string;
  rowCount: number;
  tableSize: number;
  indexSize: number;
  lastVacuum?: string;
  lastAnalyze?: string;
  timestamp: string;
}

export interface IndexUsageMetrics {
  indexName: string;
  tableName: string;
  indexSize: number;
  scans: number;
  tupleReads: number;
  tuplesFetched: number;
  timestamp: string;
}

export interface DatabasePerformanceReport {
  slowestQueries: QueryPerformanceMetrics[];
  avgQueryTime: number;
  queryTimePercentiles: Record<string, number>;
  connectionPoolUtilization: number;
  avgTransactionTime: number;
  transactionSuccess: number;
  largestTables: TableMetrics[];
  totalDatabaseSize: number;
  unusedIndexes: IndexUsageMetrics[];
  inefficientQueries: QueryPerformanceMetrics[];
}

export interface OptimizationSuggestion {
  type: 'index' | 'query' | 'vacuum' | 'connection_pool' | 'schema';
  tableName?: string;
  description: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  currentMetric?: number;
  targetMetric?: number;
  query?: string;
}

/**
 * Database Performance Monitoring Service
 */
const DatabasePerformanceService = {
  /**
   * Records query performance metrics
   * @param metrics Query performance metrics to record
   * @returns True if recording was successful
   */
  async recordQueryPerformance(metrics: Omit<QueryPerformanceMetrics, 'queryId' | 'timestamp'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('query_performance_logs')
        .insert({
          query: metrics.query,
          execution_time_ms: metrics.executionTime,
          row_count: metrics.rowCount,
          user_id: metrics.userId,
          source: metrics.source,
          success: metrics.success,
          error_message: metrics.errorMessage,
          query_params: metrics.queryParams,
          query_plan: metrics.queryPlan
        });

      if (error) {
        console.error('Error recording query performance:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception recording query performance:', error);
      return false;
    }
  },

  /**
   * Records connection pool metrics
   * @param metrics Connection pool metrics to record
   * @returns True if recording was successful
   */
  async recordConnectionPoolMetrics(metrics: Omit<ConnectionPoolMetrics, 'timestamp'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('connection_pool_logs')
        .insert({
          total_connections: metrics.totalConnections,
          active_connections: metrics.activeConnections, 
          idle_connections: metrics.idleConnections,
          waiting_connections: metrics.waitingConnections,
          max_connections: metrics.maxConnections
        });

      if (error) {
        console.error('Error recording connection pool metrics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception recording connection pool metrics:', error);
      return false;
    }
  },

  /**
   * Records transaction metrics
   * @param metrics Transaction metrics to record
   * @returns True if recording was successful
   */
  async recordTransactionMetrics(metrics: Omit<TransactionMetrics, 'transactionId'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transaction_performance_logs')
        .insert({
          start_time: metrics.startTime,
          end_time: metrics.endTime,
          duration_ms: metrics.duration,
          operations_count: metrics.operations,
          success: metrics.success,
          error_message: metrics.errorMessage,
          isolation_level: metrics.isolationLevel,
          user_id: metrics.userId,
          source: metrics.source
        });

      if (error) {
        console.error('Error recording transaction metrics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception recording transaction metrics:', error);
      return false;
    }
  },

  /**
   * Records table metrics
   * @param metrics Table metrics to record
   * @returns True if recording was successful
   */
  async recordTableMetrics(metrics: Omit<TableMetrics, 'timestamp'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('table_metrics_logs')
        .insert({
          table_name: metrics.tableName,
          row_count: metrics.rowCount,
          table_size_bytes: metrics.tableSize,
          index_size_bytes: metrics.indexSize,
          last_vacuum: metrics.lastVacuum,
          last_analyze: metrics.lastAnalyze
        });

      if (error) {
        console.error('Error recording table metrics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception recording table metrics:', error);
      return false;
    }
  },

  /**
   * Records index usage metrics
   * @param metrics Index usage metrics to record
   * @returns True if recording was successful
   */
  async recordIndexUsageMetrics(metrics: Omit<IndexUsageMetrics, 'timestamp'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('index_usage_logs')
        .insert({
          index_name: metrics.indexName,
          table_name: metrics.tableName,
          index_size_bytes: metrics.indexSize,
          scans: metrics.scans,
          tuples_read: metrics.tupleReads,
          tuples_fetched: metrics.tuplesFetched
        });

      if (error) {
        console.error('Error recording index usage metrics:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception recording index usage metrics:', error);
      return false;
    }
  },

  /**
   * Gets a database performance report for the specified time range
   * @param timeRange Time range for the report
   * @returns Database performance report
   */
  async getDatabasePerformanceReport(
    timeRange: { from: string; to: string }
  ): Promise<DatabasePerformanceReport | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_database_performance_report', {
          from_time: timeRange.from,
          to_time: timeRange.to
        });

      if (error) {
        console.error('Error fetching database performance report:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting database performance report:', error);
      return null;
    }
  },

  /**
   * Gets optimization suggestions for the database
   * @returns Array of optimization suggestions
   */
  async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_database_optimization_suggestions');

      if (error) {
        console.error('Error fetching optimization suggestions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting optimization suggestions:', error);
      return [];
    }
  },

  /**
   * Gets connection pool utilization metrics for the specified time range
   * @param timeRange Time range for the metrics
   * @returns Connection pool metrics over time
   */
  async getConnectionPoolMetrics(
    timeRange: { from: string; to: string }
  ): Promise<ConnectionPoolMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('connection_pool_logs')
        .select('*')
        .gte('created_at', timeRange.from)
        .lte('created_at', timeRange.to)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching connection pool metrics:', error);
        return [];
      }

      return (data || []).map(item => ({
        totalConnections: item.total_connections,
        activeConnections: item.active_connections,
        idleConnections: item.idle_connections,
        waitingConnections: item.waiting_connections,
        maxConnections: item.max_connections,
        timestamp: item.created_at
      }));
    } catch (error) {
      console.error('Error getting connection pool metrics:', error);
      return [];
    }
  },

  /**
   * Gets the slowest queries for the specified time range
   * @param timeRange Time range for the queries
   * @param limit Maximum number of queries to return
   * @returns Array of slow query metrics
   */
  async getSlowestQueries(
    timeRange: { from: string; to: string },
    limit: number = 20
  ): Promise<QueryPerformanceMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('query_performance_logs')
        .select('*')
        .gte('created_at', timeRange.from)
        .lte('created_at', timeRange.to)
        .order('execution_time_ms', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching slowest queries:', error);
        return [];
      }

      return (data || []).map(item => ({
        queryId: item.id,
        query: item.query,
        executionTime: item.execution_time_ms,
        rowCount: item.row_count,
        userId: item.user_id,
        source: item.source,
        timestamp: item.created_at,
        success: item.success,
        errorMessage: item.error_message,
        queryParams: item.query_params,
        queryPlan: item.query_plan
      }));
    } catch (error) {
      console.error('Error getting slowest queries:', error);
      return [];
    }
  },

  /**
   * Gets table metrics for all tables or a specific table
   * @param tableName Optional table name to filter metrics
   * @returns Array of table metrics
   */
  async getTableMetrics(tableName?: string): Promise<TableMetrics[]> {
    try {
      let query = supabase
        .from('table_metrics_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (tableName) {
        query = query.eq('table_name', tableName);
      }

      // Get only the most recent entry for each table
      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching table metrics:', error);
        return [];
      }

      // Group by table name and take the most recent entry
      const latestMetricsByTable = new Map<string, any>();
      
      (data || []).forEach(item => {
        if (!latestMetricsByTable.has(item.table_name) || 
            new Date(item.created_at) > new Date(latestMetricsByTable.get(item.table_name).created_at)) {
          latestMetricsByTable.set(item.table_name, item);
        }
      });

      return Array.from(latestMetricsByTable.values()).map(item => ({
        tableName: item.table_name,
        rowCount: item.row_count,
        tableSize: item.table_size_bytes,
        indexSize: item.index_size_bytes,
        lastVacuum: item.last_vacuum,
        lastAnalyze: item.last_analyze,
        timestamp: item.created_at
      }));
    } catch (error) {
      console.error('Error getting table metrics:', error);
      return [];
    }
  },

  /**
   * Creates a HOC for tracking query performance
   * @param queryFn Function that executes a query
   * @param queryName Name of the query for tracking
   * @param source Source/context of the query
   * @returns Wrapped function with performance tracking
   */
  withQueryPerformanceTracking<T, P extends any[]>(
    queryFn: (...args: P) => Promise<T>,
    queryName: string,
    source: string
  ) {
    return async (...args: P): Promise<T> => {
      const startTime = performance.now();
      let success = false;
      let errorMessage: string | undefined;
      let rowCount = 0;
      
      try {
        const result = await queryFn(...args);
        success = true;
        
        // Try to determine row count
        if (Array.isArray(result)) {
          rowCount = result.length;
        } else if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
          rowCount = result.data.length;
        }
        
        return result;
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        // Record performance metrics (don't await to avoid slowing down the request)
        this.recordQueryPerformance({
          query: queryName,
          executionTime,
          rowCount,
          source,
          success,
          errorMessage,
          queryParams: args.length > 0 ? args[0] : undefined
        }).catch(e => console.error('Error recording query performance:', e));
      }
    };
  },

  /**
   * Tracks a database transaction
   * @param transactionFn Function that executes the transaction
   * @param source Source/context of the transaction
   * @param userId Optional user ID associated with the transaction
   * @returns Result of the transaction function
   */
  async trackTransaction<T>(
    transactionFn: () => Promise<T>,
    source: string,
    userId?: string
  ): Promise<T> {
    const startTime = new Date();
    let operations = 0;
    let success = false;
    let errorMessage: string | undefined;

    // Create a proxy to count operations
    const operationCounter = {
      increment: () => {
        operations++;
      }
    };

    try {
      // Execute the transaction function
      const result = await transactionFn();
      success = true;
      return result;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Record transaction metrics (don't await to avoid slowing down the request)
      this.recordTransactionMetrics({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        operations,
        success,
        errorMessage,
        userId,
        source
      }).catch(e => console.error('Error recording transaction metrics:', e));
    }
  },

  /**
   * Sets up the required database schema for database performance monitoring
   */
  async setupDatabaseMonitoringSchema(): Promise<boolean> {
    try {
      // Create required database objects
      const { error } = await supabase.rpc('setup_database_monitoring_schema');
      
      if (error) {
        console.error('Error setting up database monitoring schema:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception setting up database monitoring schema:', error);
      return false;
    }
  },

  /**
   * Collects database statistics for all tracked tables
   * Updates table metrics, index usage, and related statistics
   */
  async collectDatabaseStatistics(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('collect_database_statistics');
      
      if (error) {
        console.error('Error collecting database statistics:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception collecting database statistics:', error);
      return false;
    }
  }
};

// Export as singleton
export default DatabasePerformanceService; 