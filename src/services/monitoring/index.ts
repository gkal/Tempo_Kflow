/**
 * Monitoring Service Index
 * 
 * This file exports the Database Performance Service and monitoring utilities
 * for easy integration with the rest of the application.
 */

import DatabasePerformanceService, { withPerformanceTracking } from './databasePerformanceService';
import { supabase } from '@/lib/supabaseClient';
import { fetchRecords, fetchRecordById, createRecord, updateRecord, softDeleteRecord } from '@/services/api/supabaseService';

// Export the service
export { DatabasePerformanceService };

// Create tracked versions of common database operations
export const monitoredOperations = {
  // Wrap fetchRecords with performance tracking
  fetchRecords: withPerformanceTracking(
    fetchRecords,
    'fetchRecords',
    'supabaseService'
  ),
  
  // Wrap fetchRecordById with performance tracking
  fetchRecordById: withPerformanceTracking(
    fetchRecordById,
    'fetchRecordById',
    'supabaseService'
  ),
  
  // Wrap createRecord with performance tracking
  createRecord: withPerformanceTracking(
    createRecord,
    'createRecord',
    'supabaseService'
  ),
  
  // Wrap updateRecord with performance tracking
  updateRecord: withPerformanceTracking(
    updateRecord,
    'updateRecord',
    'supabaseService'
  ),
  
  // Wrap softDeleteRecord with performance tracking
  softDeleteRecord: withPerformanceTracking(
    softDeleteRecord,
    'softDeleteRecord',
    'supabaseService'
  )
};

/**
 * Initialize database monitoring
 * @returns Promise that resolves when initialization is complete
 */
export async function initDatabaseMonitoring(): Promise<boolean> {
  try {
    // Try to query the table directly - this will error if it doesn't exist
    let tableExists = false;
    try {
      const { data } = await supabase
        .from('query_performance_logs')
        .select('id')
        .limit(1);
      
      tableExists = true; // No error means table exists
    } catch (e) {
      tableExists = false; // Error means table doesn't exist
    }
    
    // If table doesn't exist, set it up
    if (!tableExists) {
      const setupSuccess = await DatabasePerformanceService.setupMonitoringSchema();
      if (!setupSuccess) {
        console.error('Failed to set up monitoring schema');
        return false;
      }
      console.info('Database monitoring schema set up successfully');
    }
    
    // Start collecting performance data
    console.info('Database performance monitoring initialized');
    return true;
  } catch (err) {
    console.error('Error initializing database monitoring:', err);
    return false;
  }
}

/**
 * Generate a performance report with optimization suggestions
 * @returns Object containing performance metrics and suggestions
 */
export async function generatePerformanceReport() {
  try {
    // Get slow queries
    const slowQueries = await DatabasePerformanceService.identifySlowQueries();
    
    // Get table statistics
    const tableStats = await DatabasePerformanceService.getTableStatistics();
    
    // Get optimization suggestions
    const suggestions = await DatabasePerformanceService.generateOptimizationSuggestions();
    
    // Get connection pool stats
    const poolStats = await DatabasePerformanceService.getConnectionPoolStats();
    
    return {
      timestamp: new Date().toISOString(),
      slowQueries,
      tableStatistics: tableStats,
      optimizationSuggestions: suggestions,
      connectionPoolStatistics: poolStats
    };
  } catch (err) {
    console.error('Error generating performance report:', err);
    throw err;
  }
}

export default {
  DatabasePerformanceService,
  monitoredOperations,
  initDatabaseMonitoring,
  generatePerformanceReport,
  withPerformanceTracking
}; 