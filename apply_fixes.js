// Script to apply SQL fixes to the database
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

async function applyFixes() {
  console.log('Applying database fixes...');
  
  try {
    // Read the SQL files
    const constraintsSQL = fs.readFileSync(path.join(rootDir, 'remove_offer_history_constraints.sql'), 'utf8');
    const triggerSQL = fs.readFileSync(path.join(rootDir, 'fix_trigger.sql'), 'utf8');
    
    // Apply the fixes
    console.log('Removing constraints...');
    const { error: constraintsError } = await supabase.rpc('run_sql', { sql: constraintsSQL });
    if (constraintsError) {
      console.error('Error removing constraints:', constraintsError);
    } else {
      console.log('✅ Constraints removed successfully');
    }
    
    console.log('Fixing trigger function...');
    const { error: triggerError } = await supabase.rpc('run_sql', { sql: triggerSQL });
    if (triggerError) {
      console.error('Error fixing trigger:', triggerError);
    } else {
      console.log('✅ Trigger function fixed successfully');
    }
    
    console.log('All fixes applied!');
  } catch (err) {
    console.error('Unexpected error applying fixes:', err);
  }
}

// Run the fixes
applyFixes(); 