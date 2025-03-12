// Script to verify that the database constraints have been properly removed
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
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConstraintsRemoved() {
  console.log('Verifying that constraints have been removed...');
  
  try {
    // Run a query to check for constraints on offer_history table
    const { data, error } = await supabase.rpc('check_constraints', {
      table_name: 'offer_history'
    });
    
    if (error) {
      console.error('Error checking constraints:', error);
      
      // Alternative approach: try to insert a record with a non-existent user ID
      console.log('Attempting to insert a test record...');
      const testUUID = '00000000-0000-0000-0000-000000000000'; // Non-existent UUID
      
      const { error: insertError } = await supabase
        .from('offer_history')
        .insert({
          offer_id: testUUID, // This will likely fail due to offer_id constraint
          previous_assigned_to: testUUID, // This should NOT fail if constraint is removed
          new_assigned_to: testUUID, // This should NOT fail if constraint is removed
          new_status: 'test',
          changed_by: testUUID, // This will likely fail due to changed_by constraint
          notes: 'Test record'
        });
      
      if (insertError) {
        console.log('Insert test result:', insertError);
        if (insertError.message.includes('violates foreign key constraint "offer_history_previous_assigned_to_fkey"')) {
          console.error('❌ Constraint still exists on previous_assigned_to!');
        } else if (insertError.message.includes('offer_id')) {
          console.log('✅ previous_assigned_to constraint removed (failed on offer_id as expected)');
        } else {
          console.log('⚠️ Inconclusive test, different error occurred');
        }
      } else {
        console.log('✅ Test record inserted successfully, constraints removed!');
        // Clean up test record
        await supabase.from('offer_history').delete().eq('notes', 'Test record');
      }
    } else {
      console.log('Constraints check result:', data);
      const previousAssignedToConstraint = data.find(c => 
        c.constraint_name?.includes('previous_assigned_to_fkey'));
      
      if (previousAssignedToConstraint) {
        console.error('❌ Constraint still exists on previous_assigned_to!');
      } else {
        console.log('✅ previous_assigned_to constraint removed successfully!');
      }
    }
  } catch (err) {
    console.error('Unexpected error during verification:', err);
  }
}

// Run the verification
verifyConstraintsRemoved(); 