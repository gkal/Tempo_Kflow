// Run the schema update script
import { execSync } from 'child_process';

console.log('Running database schema update...');
try {
  execSync('node scripts/update-schema.js', { stdio: 'inherit' });
  console.log('Database schema update completed successfully.');
} catch (error) {
  console.error('Error running schema update:', error);
  process.exit(1);
} 