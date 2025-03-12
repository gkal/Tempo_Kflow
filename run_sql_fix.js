// Script to run the SQL fix directly against the database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname);

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQLFix() {
  console.log('Running SQL fix...');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync(path.join(rootDir, 'remove_all_constraints.sql'), 'utf8');
    
    // Run the SQL
    const { error } = await supabase.rpc('run_sql', { sql });
    
    if (error) {
      console.error('Error running SQL fix:', error);
      
      // Try an alternative approach
      console.log('Trying alternative approach...');
      
      // Create a direct SQL query to drop the constraint
      const directSQL = `
        ALTER TABLE offer_history DROP CONSTRAINT IF EXISTS offer_history_changed_by_fkey;
        ALTER TABLE offer_history ALTER COLUMN changed_by DROP NOT NULL;
      `;
      
      const { error: directError } = await supabase.rpc('run_sql', { sql: directSQL });
      
      if (directError) {
        console.error('Error with alternative approach:', directError);
      } else {
        console.log('✅ Alternative approach succeeded!');
      }
    } else {
      console.log('✅ SQL fix applied successfully!');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the SQL fix
runSQLFix(); 