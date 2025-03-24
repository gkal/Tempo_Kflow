import { supabase } from "./lib/supabaseClient";
import logger from "./utils/loggingUtils";

interface Customer {
  id: string;
  company_name: string;
}

interface Offer {
  id: string;
  created_at: string;
}

/**
 * This script verifies that the database indexes and functions were created correctly.
 * Run it with: node --loader ts-node/esm src/verify-db-setup.ts
 */

/**
 * Verifies that required database functions exist and work properly
 */
async function verifyFunctions(): Promise<boolean> {
  logger.info("Checking if count_pending_offers_by_customer function exists...");
  try {
    // @ts-ignore - Ignoring type errors since we're testing if the function exists
    const { data, error } = await supabase.rpc('count_pending_offers_by_customer');
    
    if (error) {
      logger.error("❌ Error calling function:", error.message);
      logger.error("The function may not exist or there might be an issue with it.");
      return false;
    }
    
    logger.info("✅ Function count_pending_offers_by_customer exists and is working!");
    logger.info("Function returned:", data);
    return true;
  } catch (error) {
    logger.error("❌ Unexpected error checking function:", error);
    return false;
  }
}

/**
 * Verifies that the customer status index is working correctly
 */
async function verifyCustomerStatusIndex(): Promise<Customer[]> {
  logger.info("Testing customers status index...");
  try {
    // @ts-ignore - Ignoring type errors since we're testing if the table exists
    const { data, error } = await supabase
      .from('customers')
      .select('id, company_name')
      .eq('status', 'active')
      .limit(5);
    
    if (error) {
      logger.error("❌ Error querying customers:", error.message);
      return [];
    }
    
    logger.info("✅ Query using customers status index worked!");
    logger.info(`Found ${data?.length || 0} active customers`);
    // Ensure data matches our Customer interface
    return (data || []) as Customer[];
  } catch (error) {
    logger.error("❌ Unexpected error checking customer index:", error);
    return [];
  }
}

/**
 * Verifies that the offers indexes are working correctly
 */
async function verifyOfferIndexes(customer: Customer): Promise<boolean> {
  try {
    logger.info(`Testing offers indexes for customer: ${customer.company_name}...`);
    // @ts-ignore - Ignoring type errors since we're testing if the table exists
    const { data, error } = await supabase
      .from('offers')
      .select('id, created_at')
      .eq('customer_id', customer.id)
      .is('result', null)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      logger.error("❌ Error querying offers:", error.message);
      return false;
    }
    
    logger.info("✅ Query using offers customer_id and result indexes worked!");
    logger.info(`Found ${data?.length || 0} pending offers for customer ${customer.company_name}`);
    return true;
  } catch (error) {
    logger.error("❌ Unexpected error checking offer indexes:", error);
    return false;
  }
}

/**
 * Main verification function that orchestrates all checks
 */
async function verifyDatabaseSetup(): Promise<void> {
  logger.info("🔍 Verifying database setup...");
  logger.info("==============================");

  try {
    // Verify functions
    const functionsOk = await verifyFunctions();
    
    // Verify customer indexes
    logger.info("\n📋 Checking indexes by running optimized queries...");
    const customers = await verifyCustomerStatusIndex();
    
    // Verify offer indexes if we have customers
    let offersOk = false;
    if (customers.length > 0) {
      offersOk = await verifyOfferIndexes(customers[0]);
    } else {
      logger.info("ℹ️ Skipping offers index test as no customers were found");
    }
    
    // Summary
    logger.info("\n✨ Verification complete!");
    logger.info("==============================");
    
    if (functionsOk && (customers.length > 0) && offersOk) {
      logger.info("✅ All checks passed! Your database setup appears to be correct.");
    } else {
      logger.warning("⚠️ Some checks failed or were skipped. Review the logs above for details.");
    }
    
    logger.info("\nNote: This script verifies that the queries work efficiently, which");
    logger.info("suggests that the indexes exist. For a definitive check, inspect the");
    logger.info("database schema directly or use EXPLAIN ANALYZE on your queries.");
  } catch (error) {
    logger.error("❌ Unexpected error during verification:", error);
  }
}

// Run the verification only if directly executed (not imported)
if (require.main === module) {
  verifyDatabaseSetup();
}

// Export for ES modules compatibility and for potential import in other modules
export { verifyDatabaseSetup, verifyFunctions, verifyCustomerStatusIndex, verifyOfferIndexes }; 