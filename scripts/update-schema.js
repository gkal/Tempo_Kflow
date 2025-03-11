// Script to safely update the database schema
// This script will check if columns exist before trying to add them
// and will handle data migration if needed

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // This should be a service key with more privileges

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set.');
  process.exit(1);
}

// Create Supabase client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    console.log('Starting database schema update...');

    // Check if tasks table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'tasks')
      .eq('table_schema', 'public');

    if (tableError) {
      console.error('Error checking if tasks table exists:', tableError);
      process.exit(1);
    }

    if (!tableExists || tableExists.length === 0) {
      console.log('Tasks table does not exist. Creating it...');
      
      // Create tasks table
      const { error: createError } = await supabase.rpc('create_tasks_table');
      
      if (createError) {
        console.error('Error creating tasks table:', createError);
        process.exit(1);
      }
      
      console.log('Tasks table created successfully.');
    } else {
      console.log('Tasks table already exists.');
    }

    // Check if due_date column exists
    const { data: dueDateExists, error: dueDateError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'tasks')
      .eq('column_name', 'due_date')
      .eq('table_schema', 'public');

    if (dueDateError) {
      console.error('Error checking if due_date column exists:', dueDateError);
      process.exit(1);
    }

    // Check if due_date_time column exists
    const { data: dueDateTimeExists, error: dueDateTimeError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'tasks')
      .eq('column_name', 'due_date_time')
      .eq('table_schema', 'public');

    if (dueDateTimeError) {
      console.error('Error checking if due_date_time column exists:', dueDateTimeError);
      process.exit(1);
    }

    // Handle column migration if needed
    if (dueDateTimeExists && dueDateTimeExists.length > 0 && (!dueDateExists || dueDateExists.length === 0)) {
      console.log('due_date_time column exists but due_date does not. Adding due_date column...');
      
      // Add due_date column
      const { error: addColumnError } = await supabase.rpc('add_due_date_column');
      
      if (addColumnError) {
        console.error('Error adding due_date column:', addColumnError);
        process.exit(1);
      }
      
      console.log('due_date column added successfully.');
      
      // Copy data from due_date_time to due_date
      const { error: copyDataError } = await supabase.rpc('copy_due_date_data');
      
      if (copyDataError) {
        console.error('Error copying data from due_date_time to due_date:', copyDataError);
        process.exit(1);
      }
      
      console.log('Data copied from due_date_time to due_date successfully.');
    } else if (dueDateExists && dueDateExists.length > 0 && (!dueDateTimeExists || dueDateTimeExists.length === 0)) {
      console.log('due_date column exists but due_date_time does not. Adding due_date_time column...');
      
      // Add due_date_time column
      const { error: addColumnError } = await supabase.rpc('add_due_date_time_column');
      
      if (addColumnError) {
        console.error('Error adding due_date_time column:', addColumnError);
        process.exit(1);
      }
      
      console.log('due_date_time column added successfully.');
      
      // Copy data from due_date to due_date_time
      const { error: copyDataError } = await supabase.rpc('copy_due_date_time_data');
      
      if (copyDataError) {
        console.error('Error copying data from due_date to due_date_time:', copyDataError);
        process.exit(1);
      }
      
      console.log('Data copied from due_date to due_date_time successfully.');
    } else if ((!dueDateExists || dueDateExists.length === 0) && (!dueDateTimeExists || dueDateTimeExists.length === 0)) {
      console.log('Neither due_date nor due_date_time column exists. Adding both columns...');
      
      // Add due_date column
      const { error: addDueDateError } = await supabase.rpc('add_due_date_column');
      
      if (addDueDateError) {
        console.error('Error adding due_date column:', addDueDateError);
        process.exit(1);
      }
      
      // Add due_date_time column
      const { error: addDueDateTimeError } = await supabase.rpc('add_due_date_time_column');
      
      if (addDueDateTimeError) {
        console.error('Error adding due_date_time column:', addDueDateTimeError);
        process.exit(1);
      }
      
      console.log('Both columns added successfully.');
    } else {
      console.log('Both due_date and due_date_time columns already exist.');
    }

    console.log('Database schema update completed successfully.');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main(); 