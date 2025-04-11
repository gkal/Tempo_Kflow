/**
 * Database Statistics Collector Worker
 * 
 * This worker runs periodically to collect database statistics and store them
 * for the database performance monitoring system.
 */

import DatabasePerformanceService from '@/services/monitoring/databasePerformanceService';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';

// Configuration for the collector
const COLLECTION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60 * 1000; // 1 minute

/**
 * Main function to collect database statistics
 */
export async function collectDatabaseStatistics(): Promise<boolean> {
  try {
    logger.info('Starting database statistics collection');
    
    // Check if the database schema is set up
    const schemaSetup = await ensureDatabaseSchemaSetup();
    if (!schemaSetup) {
      logger.error('Failed to set up database monitoring schema');
      return false;
    }
    
    // Collect the statistics
    const statsCollected = await DatabasePerformanceService.collectDatabaseStatistics();
    if (!statsCollected) {
      logger.error('Failed to collect database statistics');
      return false;
    }
    
    logger.info('Database statistics collection completed successfully');
    return true;
  } catch (error) {
    logger.error('Exception during database statistics collection:', error);
    return false;
  }
}

/**
 * Ensures the database schema is set up for monitoring
 */
async function ensureDatabaseSchemaSetup(): Promise<boolean> {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const result = await DatabasePerformanceService.setupDatabaseMonitoringSchema();
      
      if (result) {
        logger.info('Database monitoring schema is set up');
        return true;
      }
      
      logger.warn(`Failed to set up database schema, retrying (${retries + 1}/${MAX_RETRIES})`);
      retries++;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    } catch (error) {
      logger.error('Error while setting up database schema:', error);
      retries++;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  
  return false;
}

/**
 * Starts the database statistics collector
 * Will run at the configured interval and collect statistics
 */
export function startDatabaseStatisticsCollector(): void {
  logger.info('Starting database statistics collector worker');
  
  // Immediately collect statistics when starting
  collectDatabaseStatistics().catch(error => {
    logger.error('Error in initial database statistics collection:', error);
  });
  
  // Set up interval for regular collection
  const intervalId = setInterval(async () => {
    try {
      await collectDatabaseStatistics();
    } catch (error) {
      logger.error('Error in scheduled database statistics collection:', error);
    }
  }, COLLECTION_INTERVAL_MS);
  
  // Handle clean shutdown
  process.on('SIGTERM', () => {
    logger.info('Stopping database statistics collector worker');
    clearInterval(intervalId);
  });
}

// Start the collector if this file is executed directly
if (require.main === module) {
  startDatabaseStatisticsCollector();
}

export default {
  collectDatabaseStatistics,
  startDatabaseStatisticsCollector
}; 