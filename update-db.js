// Run the schema update script
import { execSync } from 'child_process';
import logger from './src/utils/loggingUtils.js';

logger.info('Running database schema update...');
try {
  execSync('node scripts/update-schema.js', { stdio: 'inherit' });
  logger.info('Database schema update completed successfully.');
} catch (error) {
  logger.error('Error running schema update:', error);
  process.exit(1);
} 