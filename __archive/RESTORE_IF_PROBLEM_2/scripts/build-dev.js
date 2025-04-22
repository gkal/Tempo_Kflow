// Script to build the application in development mode
// This will skip type checking and build the app with development settings

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
const envProdPath = path.join(rootDir, '.env.production');
const envPath = path.join(rootDir, '.env');

// Backup the current .env file if it exists
let envBackup = null;
if (fs.existsSync(envPath)) {
  envBackup = fs.readFileSync(envPath, 'utf8');
}

try {
  console.log('Building application in development mode...');
  
  // Copy development environment variables to .env
  if (fs.existsSync(envDevPath)) {
    fs.copyFileSync(envDevPath, envPath);
    console.log('Using development environment variables');
  } else {
    console.warn('Warning: .env.development not found, using current .env file');
  }
  
  // Build the application without type checking
  console.log('Running build with type checking disabled...');
  execSync('npm run build:safe', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  // Restore the original .env file
  if (envBackup) {
    fs.writeFileSync(envPath, envBackup);
    console.log('Restored original .env file');
  }
} 