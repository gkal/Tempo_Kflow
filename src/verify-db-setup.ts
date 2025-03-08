import { supabase } from "./lib/supabase";

/**
 * This script verifies that the database indexes and functions were created correctly.
 * Run it with: node --loader ts-node/esm src/verify-db-setup.ts
 */
async function verifyDatabaseSetup() {
  console.log("Verifying database setup...");

  try {
    // Check if the function exists
    console.log("Checking if count_pending_offers_by_customer function exists...");
    const { data: functionData, error: functionError } = await supabase.rpc('count_pending_offers_by_customer');
    
    if (functionError) {
      console.error("Error calling function:", functionError.message);
      console.error("The function may not exist or there might be an issue with it.");
    } else {
      console.log("✅ Function count_pending_offers_by_customer exists and is working!");
      console.log("Function returned:", functionData);
    }

    // Check indexes by running a query that would use them
    console.log("\nChecking if indexes are working by running optimized queries...");
    
    // Query that would use customer status index
    console.log("Testing customers status index...");
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, company_name')
      .eq('status', 'active')
      .limit(5);
    
    if (customersError) {
      console.error("Error querying customers:", customersError.message);
    } else {
      console.log("✅ Query using customers status index worked!");
      console.log(`Found ${customersData.length} active customers`);
    }
    
    // Query that would use offers customer_id and result indexes
    console.log("\nTesting offers customer_id and result indexes...");
    if (customersData && customersData.length > 0) {
      const customerId = customersData[0].id;
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id, created_at')
        .eq('customer_id', customerId)
        .is('result', null)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (offersError) {
        console.error("Error querying offers:", offersError.message);
      } else {
        console.log("✅ Query using offers customer_id and result indexes worked!");
        console.log(`Found ${offersData.length} pending offers for customer ${customersData[0].company_name}`);
      }
    } else {
      console.log("Skipping offers index test as no customers were found");
    }
    
    console.log("\nVerification complete!");
    console.log("If no errors were shown above, your database setup is correct.");
    console.log("Note: This script can only verify that the function and queries work, not that the indexes specifically exist.");
    console.log("However, if the queries run quickly with large datasets, the indexes are likely working correctly.");
    
  } catch (error) {
    console.error("Unexpected error during verification:", error);
  }
}

// Run the verification
verifyDatabaseSetup();

// Export for ES modules compatibility
export {}; 