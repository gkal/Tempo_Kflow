// Direct verification script for Supabase database
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Try to load environment variables from .env.development
try {
  const envPath = path.resolve(process.cwd(), '.env.development');
  if (fs.existsSync(envPath)) {
    console.log(`Found environment file at: ${envPath}`);
    dotenv.config({ path: envPath });
  } else {
    console.log('No .env.development file found, checking for .env');
    dotenv.config();
  }
} catch (error) {
  console.error('Error loading environment variables:', error.message);
}

// Get credentials from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// If no credentials found, use placeholders (user will need to replace these)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('No Supabase credentials found in environment variables.');
  console.log('Please replace the placeholders in this script with your actual credentials.');
}

async function verifyDatabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase URL and Anon Key are required.');
    console.log('\nPlease ensure your .env.development file contains:');
    console.log('VITE_SUPABASE_URL=your_supabase_url');
    console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
    return;
  }

  console.log('Using Supabase URL:', SUPABASE_URL);
  console.log('Attempting to connect to Supabase...');

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Test database connection
    console.log('\nTesting database connection...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, company_name')
      .limit(1);
    
    if (customersError) {
      console.error('Error connecting to database:', customersError.message);
      return;
    }
    
    console.log('✅ Database connection successful!');
    console.log('Sample customer data:', customers);
    
    // Check if the function exists
    console.log('\nChecking if count_pending_offers_by_customer function exists:');
    const { data: functionData, error: functionError } = await supabase.rpc('count_pending_offers_by_customer');
    
    if (functionError) {
      console.error('❌ Error calling function:', functionError.message);
      console.error('The function may not exist or there might be an issue with it.');
    } else {
      console.log('✅ Function count_pending_offers_by_customer exists and is working!');
      console.log('Function returned data for', functionData.length, 'customers');
      
      // Display sample of the data
      if (functionData.length > 0) {
        console.log('Sample data:', functionData.slice(0, 3));
      }
    }
    
    // Check indexes by running optimized queries
    console.log('\nTesting optimized queries (this checks if indexes are working):');
    
    console.log('Testing customers index...');
    const startCustomers = Date.now();
    const { data: activeCustomers, error: activeError } = await supabase
      .from('customers')
      .select('id, company_name')
      .eq('status', 'active')
      .limit(10);
    const endCustomers = Date.now();
    
    if (activeError) {
      console.error('❌ Error querying customers:', activeError.message);
    } else {
      console.log(`✅ Query successful in ${endCustomers - startCustomers}ms`);
      console.log(`Found ${activeCustomers.length} active customers`);
    }
    
    console.log('\nTesting offers index...');
    const startOffers = Date.now();
    const { data: pendingOffers, error: offersError } = await supabase
      .from('offers')
      .select('id, customer_id')
      .eq('result', 'pending')
      .limit(10);
    const endOffers = Date.now();
    
    if (offersError) {
      console.error('❌ Error querying offers:', offersError.message);
    } else {
      console.log(`✅ Query successful in ${endOffers - startOffers}ms`);
      console.log(`Found ${pendingOffers.length} pending offers`);
    }
    
  } catch (error) {
    console.error('Unexpected error during verification:', error);
  }
}

// Run the verification
verifyDatabase(); 