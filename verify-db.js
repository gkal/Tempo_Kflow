// Simple script to run the verification
import { execSync } from 'child_process';

console.log('Running database verification...');
try {
  // Convert TypeScript to JavaScript and run
  execSync('npx tsc src/verify-db-setup.ts --outDir temp --esModuleInterop --resolveJsonModule', { stdio: 'inherit' });
  execSync('node temp/verify-db-setup.js', { stdio: 'inherit' });
  console.log('Verification complete!');
} catch (error) {
  console.error('Error running verification:', error.message);
} 