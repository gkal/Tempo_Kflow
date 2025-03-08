// SQL verification script
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Check for .env or .env.development file
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.development')
];

let envFileFound = false;
let envFilePath = '';

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    envFileFound = true;
    envFilePath = envPath;
    console.log(`Found environment file at: ${envPath}`);
    
    // Try to load with dotenv
    try {
      dotenv.config({ path: envPath });
      console.log('Loaded environment variables with dotenv');
    } catch (error) {
      console.error('Error loading environment variables with dotenv:', error.message);
    }
    
    // If variables still not found, try to read file directly
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n');
        
        for (const line of envLines) {
          if (line.trim() && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
              process.env[key.trim()] = value.trim();
            }
          }
        }
        console.log('Manually parsed environment file');
      } catch (error) {
        console.error('Error reading environment file directly:', error.message);
      }
    }
    
    break;
  }
}

if (!envFileFound) {
  console.warn('No .env or .env.development file found in the current directory');
}

// Check for Supabase credentials with various possible names
const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    process.env.REACT_APP_SUPABASE_URL;
                    
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 
                        process.env.SUPABASE_ANON_KEY || 
                        process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required.');
  console.error('Environment file found:', envFileFound ? envFilePath : 'None');
  console.error('Available environment variables:', Object.keys(process.env).filter(key => 
    key.includes('SUPABASE') || key.includes('supabase')
  ));
  
  console.log('\nPlease ensure your .env.development file contains:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  
  console.log('\nAlternatively, you can create a file named supabase-credentials.js with:');
  console.log('export const supabaseUrl = "your_supabase_url";');
  console.log('export const supabaseAnonKey = "your_supabase_anon_key";');
  
  process.exit(1);
}

console.log('Supabase credentials found!');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runSqlVerification() {
  console.log("Running SQL verification...");

  try {
    // Check if the function exists
    console.log("\nChecking if count_pending_offers_by_customer function exists:");
    const { data: functionData, error: functionError } = await supabase.rpc('count_pending_offers_by_customer');
    
    if (functionError) {
      console.error("Error calling function:", functionError.message);
      console.error("The function may not exist or there might be an issue with it.");
    } else {
      console.log("✅ Function count_pending_offers_by_customer exists and is working!");
      console.log("Function returned:", functionData);
    }
    
    // Try to run a simple query to check database connection
    console.log("\nTesting database connection with a simple query:");
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, company_name')
      .limit(1);
    
    if (customersError) {
      console.error("Error querying customers:", customersError.message);
    } else {
      console.log("✅ Database connection successful!");
      console.log(`Found ${customersData.length} customers in the sample query`);
    }
    
  } catch (error) {
    console.error("Unexpected error during verification:", error);
  }
}

// Run the verification
runSqlVerification(); 