// Script to run the application in development mode with feature flags enabled
// This will use the development environment variables and enable all feature flags

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Check if .env.development exists
const envDevPath = path.join(rootDir, '.env.development');
const envPath = path.join(rootDir, '.env');

// Backup the current .env file if it exists
let envBackup = null;
if (fs.existsSync(envPath)) {
  envBackup = fs.readFileSync(envPath, 'utf8');
}

try {
  console.log('Starting application in development mode with feature flags enabled...');
  
  // Copy development environment variables to .env
  if (fs.existsSync(envDevPath)) {
    fs.copyFileSync(envDevPath, envPath);
    console.log('Using development environment variables');
  } else {
    console.warn('Warning: .env.development not found, using current .env file');
  }
  
  // Make sure all feature flags are enabled
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update feature flags
  envContent = envContent.replace(/VITE_ENABLE_NEW_TASK_CREATION=.*/, 'VITE_ENABLE_NEW_TASK_CREATION=true');
  envContent = envContent.replace(/VITE_ENABLE_UPDATED_COLUMN_NAMES=.*/, 'VITE_ENABLE_UPDATED_COLUMN_NAMES=true');
  envContent = envContent.replace(/VITE_ENABLE_DEBUG_LOGGING=.*/, 'VITE_ENABLE_DEBUG_LOGGING=true');
  
  // Add feature flags if they don't exist
  if (!envContent.includes('VITE_ENABLE_NEW_TASK_CREATION')) {
    envContent += '\nVITE_ENABLE_NEW_TASK_CREATION=true';
  }
  if (!envContent.includes('VITE_ENABLE_UPDATED_COLUMN_NAMES')) {
    envContent += '\nVITE_ENABLE_UPDATED_COLUMN_NAMES=true';
  }
  if (!envContent.includes('VITE_ENABLE_DEBUG_LOGGING')) {
    envContent += '\nVITE_ENABLE_DEBUG_LOGGING=true';
  }
  
  // Write the updated .env file
  fs.writeFileSync(envPath, envContent);
  console.log('Feature flags enabled');
  
  // Start the application in development mode
  console.log('Starting development server...');
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start development server:', error);
  process.exit(1);
} finally {
  // Restore the original .env file
  if (envBackup) {
    fs.writeFileSync(envPath, envBackup);
    console.log('Restored original .env file');
  }
} 