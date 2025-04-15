/**
 * API Performance Monitoring Service
 * 
 * This service provides functionality to monitor API performance metrics,
 * track response times, error rates, throughput, and detect performance bottlenecks.
 * It integrates with the form APIs and provides real-time insights into API performance.
 */

import { supabase } from '@/lib/supabaseClient';

// Types for API performance monitoring
export interface ApiPerformanceData {
  endpoint: string;
  method: string;
  responseTime: number;
  timestamp: string;
  statusCode: number;
  success: boolean;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  region?: string;
}

export interface ApiStats {
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  throughput: number; // requests per minute
}

export interface ResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  timestamp: string;
}

export interface PerformanceAlert {
  type: 'response_time' | 'error_rate' | 'throughput' | 'resource_usage';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  endpoint?: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
}

/**
 * API Performance Monitoring Service for tracking form API performance
 */
const ApiPerformanceService = {
  /**
   * Records API request performance data
   * @param performanceData Performance data to record
   * @returns True if the data was successfully recorded
   */
  async recordApiPerformance(performanceData: ApiPerformanceData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('api_performance_logs')
        .insert({
          endpoint: performanceData.endpoint,
          method: performanceData.method,
          response_time_ms: performanceData.responseTime,
          timestamp: performanceData.timestamp,
          status_code: performanceData.statusCode,
          success: performanceData.success,
          error_message: performanceData.errorMessage,
          request_size: performanceData.requestSize,
          response_size: performanceData.responseSize,
          user_id: performanceData.userId,
          user_agent: performanceData.userAgent,
          ip_address: performanceData.ipAddress,
          region: performanceData.region
        });

      if (error) {
        console.error('Error recording API performance:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Exception recording API performance:', err);
      return false;
    }
  },

  /**
   * Gets performance statistics for a specific API endpoint
   * @param endpoint The API endpoint to analyze
   * @param method The HTTP method (GET, POST, etc.)
   * @param timeRange Optional time range for the analysis
   * @returns Statistics for the API endpoint
   */
  async getApiStats(
    endpoint: string,
    method: string,
    timeRange?: { from: string; to: string }
  ): Promise<ApiStats | null> {
    try {
      let query = supabase
        .from('api_performance_logs')
        .select('response_time_ms, success, status_code, timestamp')
        .eq('endpoint', endpoint)
        .eq('method', method);

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.from)
          .lte('timestamp', timeRange.to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching API stats:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Sort response times for percentile calculations
      const responseTimes = data.map(item => item.response_time_ms).sort((a, b) => a - b);
      const errorCount = data.filter(item => !item.success).length;
      
      // Calculate percentiles
      const p90Index = Math.floor(responseTimes.length * 0.9);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);
      
      // Calculate throughput (requests per minute)
      let throughput = 0;
      if (data.length > 1) {
        const timestamps = data.map(item => new Date(item.timestamp).getTime());
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const timeRangeMinutes = (maxTime - minTime) / (1000 * 60);
        
        // Avoid division by zero
        throughput = timeRangeMinutes > 0 ? data.length / timeRangeMinutes : data.length;
      }
      
      return {
        averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        minResponseTime: responseTimes[0],
        maxResponseTime: responseTimes[responseTimes.length - 1],
        p90ResponseTime: responseTimes[p90Index] || responseTimes[responseTimes.length - 1],
        p95ResponseTime: responseTimes[p95Index] || responseTimes[responseTimes.length - 1],
        p99ResponseTime: responseTimes[p99Index] || responseTimes[responseTimes.length - 1],
        requestCount: data.length,
        errorCount,
        errorRate: (errorCount / data.length) * 100,
        throughput
      };
    } catch (err) {
      console.error('Exception getting API stats:', err);
      return null;
    }
  },

  /**
   * Gets performance data for all form API endpoints
   * @param timeRange Optional time range for the analysis
   * @returns Map of endpoint to statistics
   */
  async getAllApiStats(
    timeRange?: { from: string; to: string }
  ): Promise<Map<string, ApiStats>> {
    try {
      let query = supabase
        .from('api_performance_logs')
        .select('endpoint, method, response_time_ms, success, status_code, timestamp');

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.from)
          .lte('timestamp', timeRange.to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all API stats:', error);
        return new Map();
      }

      if (!data || data.length === 0) {
        return new Map();
      }

      // Group by endpoint and method
      const endpointGroups: Record<string, ApiPerformanceData[]> = {};
      
      for (const record of data) {
        const key = `${record.method}:${record.endpoint}`;
        if (!endpointGroups[key]) {
          endpointGroups[key] = [];
        }
        
        endpointGroups[key].push({
          endpoint: record.endpoint,
          method: record.method,
          responseTime: record.response_time_ms,
          timestamp: record.timestamp,
          statusCode: record.status_code,
          success: record.success
        });
      }

      // Calculate statistics for each endpoint
      const result = new Map<string, ApiStats>();
      
      for (const [key, records] of Object.entries(endpointGroups)) {
        const responseTimes = records.map(r => r.responseTime).sort((a, b) => a - b);
        const errorCount = records.filter(r => !r.success).length;
        
        // Calculate percentiles
        const p90Index = Math.floor(responseTimes.length * 0.9);
        const p95Index = Math.floor(responseTimes.length * 0.95);
        const p99Index = Math.floor(responseTimes.length * 0.99);
        
        // Calculate throughput (requests per minute)
        let throughput = 0;
        if (records.length > 1) {
          const timestamps = records.map(item => new Date(item.timestamp).getTime());
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          const timeRangeMinutes = (maxTime - minTime) / (1000 * 60);
          
          // Avoid division by zero
          throughput = timeRangeMinutes > 0 ? records.length / timeRangeMinutes : records.length;
        }
        
        result.set(key, {
          averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
          minResponseTime: responseTimes[0],
          maxResponseTime: responseTimes[responseTimes.length - 1],
          p90ResponseTime: responseTimes[p90Index] || responseTimes[responseTimes.length - 1],
          p95ResponseTime: responseTimes[p95Index] || responseTimes[responseTimes.length - 1],
          p99ResponseTime: responseTimes[p99Index] || responseTimes[responseTimes.length - 1],
          requestCount: records.length,
          errorCount,
          errorRate: (errorCount / records.length) * 100,
          throughput
        });
      }
      
      return result;
    } catch (err) {
      console.error('Exception getting all API stats:', err);
      return new Map();
    }
  },

  /**
   * Detects performance bottlenecks in API endpoints
   * @param timeRange Optional time range for the analysis
   * @param responseTimeThreshold Threshold in ms to consider an API slow
   * @param errorRateThreshold Threshold percentage to consider an error rate high
   * @returns List of endpoints with performance issues
   */
  async detectBottlenecks(
    timeRange?: { from: string; to: string },
    responseTimeThreshold: number = 500,
    errorRateThreshold: number = 5
  ): Promise<{endpoint: string; method: string; stats: ApiStats; issues: string[]}[]> {
    try {
      const allStats = await this.getAllApiStats(timeRange);
      const bottlenecks = [];

      for (const [key, stats] of allStats.entries()) {
        const [method, endpoint] = key.split(':');
        const issues = [];
        
        if (stats.averageResponseTime > responseTimeThreshold) {
          issues.push(`High average response time (${stats.averageResponseTime.toFixed(2)}ms)`);
        }
        
        if (stats.p95ResponseTime > responseTimeThreshold * 2) {
          issues.push(`High p95 response time (${stats.p95ResponseTime.toFixed(2)}ms)`);
        }
        
        if (stats.errorRate > errorRateThreshold) {
          issues.push(`High error rate (${stats.errorRate.toFixed(2)}%)`);
        }
        
        if (issues.length > 0) {
          bottlenecks.push({
            endpoint,
            method,
            stats,
            issues
          });
        }
      }
      
      // Sort by average response time (descending)
      return bottlenecks.sort((a, b) => b.stats.averageResponseTime - a.stats.averageResponseTime);
    } catch (err) {
      console.error('Exception detecting bottlenecks:', err);
      return [];
    }
  },

  /**
   * Generates alerts for performance degradation
   * @param timeRange Optional time range for the analysis
   * @param historicalTimeRange Optional time range for historical comparison
   * @returns List of performance alerts
   */
  async generatePerformanceAlerts(
    timeRange: { from: string; to: string },
    historicalTimeRange?: { from: string; to: string }
  ): Promise<PerformanceAlert[]> {
    try {
      // Get current stats
      const currentStats = await this.getAllApiStats(timeRange);
      
      // Get historical stats if a historical time range is provided
      let historicalStats: Map<string, ApiStats> | null = null;
      if (historicalTimeRange) {
        historicalStats = await this.getAllApiStats(historicalTimeRange);
      }
      
      const alerts: PerformanceAlert[] = [];
      
      // Thresholds
      const criticalResponseTime = 1000; // 1 second
      const warningResponseTime = 500; // 500 ms
      const criticalErrorRate = 10; // 10%
      const warningErrorRate = 5; // 5%
      const throughputDecreaseFactor = 0.5; // 50% decrease
      
      for (const [key, stats] of currentStats.entries()) {
        const [method, endpoint] = key.split(':');
        
        // Response time alerts
        if (stats.p95ResponseTime > criticalResponseTime) {
          alerts.push({
            type: 'response_time',
            severity: 'critical',
            message: `Critical: p95 response time for ${method} ${endpoint} is ${stats.p95ResponseTime.toFixed(2)}ms`,
            endpoint: key,
            currentValue: stats.p95ResponseTime,
            threshold: criticalResponseTime,
            timestamp: new Date().toISOString()
          });
        } else if (stats.p95ResponseTime > warningResponseTime) {
          alerts.push({
            type: 'response_time',
            severity: 'warning',
            message: `Warning: p95 response time for ${method} ${endpoint} is ${stats.p95ResponseTime.toFixed(2)}ms`,
            endpoint: key,
            currentValue: stats.p95ResponseTime,
            threshold: warningResponseTime,
            timestamp: new Date().toISOString()
          });
        }
        
        // Error rate alerts
        if (stats.errorRate > criticalErrorRate) {
          alerts.push({
            type: 'error_rate',
            severity: 'critical',
            message: `Critical: error rate for ${method} ${endpoint} is ${stats.errorRate.toFixed(2)}%`,
            endpoint: key,
            currentValue: stats.errorRate,
            threshold: criticalErrorRate,
            timestamp: new Date().toISOString()
          });
        } else if (stats.errorRate > warningErrorRate) {
          alerts.push({
            type: 'error_rate',
            severity: 'warning',
            message: `Warning: error rate for ${method} ${endpoint} is ${stats.errorRate.toFixed(2)}%`,
            endpoint: key,
            currentValue: stats.errorRate,
            threshold: warningErrorRate,
            timestamp: new Date().toISOString()
          });
        }
        
        // Throughput comparison with historical data
        if (historicalStats && historicalStats.has(key)) {
          const historicalStatsForEndpoint = historicalStats.get(key)!;
          const throughputDecrease = 1 - (stats.throughput / historicalStatsForEndpoint.throughput);
          
          if (throughputDecrease > throughputDecreaseFactor) {
            alerts.push({
              type: 'throughput',
              severity: 'warning',
              message: `Warning: throughput for ${method} ${endpoint} decreased by ${(throughputDecrease * 100).toFixed(2)}%`,
              endpoint: key,
              currentValue: stats.throughput,
              threshold: historicalStatsForEndpoint.throughput * (1 - throughputDecreaseFactor),
              timestamp: new Date().toISOString()
            });
          }
        }
      }
      
      return alerts;
    } catch (err) {
      console.error('Exception generating performance alerts:', err);
      return [];
    }
  },

  /**
   * Records resource usage metrics (CPU, memory)
   * @param resourceData Resource usage data
   * @returns True if the data was successfully recorded
   */
  async recordResourceUsage(resourceData: ResourceUsage): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('api_resource_usage')
        .insert({
          cpu_usage: resourceData.cpuUsage,
          memory_usage: resourceData.memoryUsage,
          timestamp: resourceData.timestamp
        });

      if (error) {
        console.error('Error recording resource usage:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Exception recording resource usage:', err);
      return false;
    }
  },

  /**
   * Gets resource usage metrics for a time period
   * @param timeRange Optional time range for the analysis
   * @returns Array of resource usage data points
   */
  async getResourceUsage(
    timeRange?: { from: string; to: string }
  ): Promise<ResourceUsage[]> {
    try {
      let query = supabase
        .from('api_resource_usage')
        .select('cpu_usage, memory_usage, timestamp')
        .order('timestamp', { ascending: true });

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.from)
          .lte('timestamp', timeRange.to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching resource usage:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(item => ({
        cpuUsage: item.cpu_usage,
        memoryUsage: item.memory_usage,
        timestamp: item.timestamp
      }));
    } catch (err) {
      console.error('Exception getting resource usage:', err);
      return [];
    }
  },

  /**
   * Sets up the required database tables for API performance monitoring
   * @returns True if the setup was successful
   */
  async setupApiMonitoringSchema(): Promise<boolean> {
    try {
      // Create API performance logs table
      const { error: apiTableError } = await supabase.rpc('create_api_performance_table');
      
      if (apiTableError) {
        console.error('Error creating API performance table:', apiTableError);
        return false;
      }
      
      // Create resource usage table
      const { error: resourceTableError } = await supabase.rpc('create_resource_usage_table');
      
      if (resourceTableError) {
        console.error('Error creating resource usage table:', resourceTableError);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Exception setting up API monitoring schema:', err);
      return false;
    }
  }
};

export default ApiPerformanceService; 