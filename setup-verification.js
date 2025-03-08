// Setup script for verification
import { execSync } from 'child_process';

console.log('Setting up verification dependencies...');
try {
  // Install required packages
  console.log('Installing dotenv and @supabase/supabase-js...');
  execSync('npm install dotenv @supabase/supabase-js', { stdio: 'inherit' });
  
  console.log('\nSetup complete! You can now run the verification with:');
  console.log('node verify-db-direct.js');
  
  console.log('\nOr you can run the SQL verification with:');
  console.log('node verify-db-sql.js');
  
  console.log('\nMake sure you have a .env file with your Supabase credentials:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
} catch (error) {
  console.error('Error setting up verification:', error.message);
} 