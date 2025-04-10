/**
 * Migration script to update equipment_items.dates_available column
 * Changes the column from timestamp to integer to store maximum days available
 */

const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  try {
    console.log('Running migration: Update equipment_items.dates_available column type');
    
    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'update_equipment_items_dates_available.sql');
    const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute SQL query
    const { error } = await supabase.rpc('pgmigration_execute', { query: sqlQuery });
    
    if (error) {
      throw error;
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration(); 