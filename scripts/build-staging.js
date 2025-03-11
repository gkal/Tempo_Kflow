// Script to build the application in staging mode
// This will use the staging environment variables

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Check if .env.staging exists
const envStagingPath = path.join(rootDir, '.env.staging');
const envPath = path.join(rootDir, '.env');

// Backup the current .env file if it exists
let envBackup = null;
if (fs.existsSync(envPath)) {
  envBackup = fs.readFileSync(envPath, 'utf8');
}

try {
  console.log('Building application in staging mode...');
  
  // Copy staging environment variables to .env
  if (fs.existsSync(envStagingPath)) {
    fs.copyFileSync(envStagingPath, envPath);
    console.log('Using staging environment variables');
  } else {
    console.warn('Warning: .env.staging not found, using current .env file');
  }
  
  // Build the application with staging settings
  console.log('Running build with staging settings...');
  execSync('npm run build:staging', { stdio: 'inherit' });
  
  console.log('Staging build completed successfully!');
} catch (error) {
  console.error('Staging build failed:', error);
  process.exit(1);
} finally {
  // Restore the original .env file
  if (envBackup) {
    fs.writeFileSync(envPath, envBackup);
    console.log('Restored original .env file');
  }
} 