// Script to run the application after fixing the database constraints
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname);

console.log('Starting application after database fixes...');

try {
  // Check if we're in development mode
  const envPath = path.join(rootDir, '.env');
  const envDevPath = path.join(rootDir, '.env.development');
  
  if (fs.existsSync(envDevPath)) {
    console.log('Using development environment...');
    fs.copyFileSync(envDevPath, envPath);
  }
  
  // Start the application
  console.log('Starting the application...');
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('Error starting application:', error);
  process.exit(1);
} 