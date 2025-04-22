const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.development' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Read SQL file
const sqlFile = fs.readFileSync('sql/ensure_soft_delete_columns.sql', 'utf8');

// Split SQL commands by semicolon
const sqlCommands = sqlFile
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

// Execute each SQL command
async function executeSql() {
  console.log(`Found ${sqlCommands.length} SQL commands to execute`);
  
  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i] + ';';
    try {
      console.log(`Executing command ${i + 1}/${sqlCommands.length}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error(`Error executing SQL command ${i + 1}:`, error);
      } else {
        console.log(`Command ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.error(`Exception for command ${i + 1}:`, err);
    }
  }
  
  console.log('SQL script execution completed');
}

// Start execution
executeSql(); 