/**
 * Worker Registration Module
 * 
 * This module initializes and registers all background workers for the application.
 * Workers handle tasks that need to run periodically in the background.
 */

import { startDatabaseStatisticsCollector } from './databaseStatisticsCollector';

/**
 * Initialize and start all background workers
 */
export function initializeWorkers(): void {
  // Start the database statistics collector
  if (process.env.NEXT_PUBLIC_ENABLE_DB_MONITORING === 'true') {
    console.log('Starting database statistics collector worker...');
    startDatabaseStatisticsCollector();
  }

  // Additional workers can be added here in the future
}

export default {
  initializeWorkers
}; 