-- SQL script to check if the indexes exist

-- Check indexes on customers table
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'customers' 
    AND (
        indexname = 'idx_customers_status' 
        OR indexname = 'idx_customers_company_name'
    );

-- Check indexes on offers table
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'offers' 
    AND (
        indexname = 'idx_offers_customer_id' 
        OR indexname = 'idx_offers_result'
        OR indexname = 'idx_offers_created_at'
        OR indexname = 'idx_offers_customer_result'
    );

-- Check indexes on contacts table
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'contacts' 
    AND indexname = 'idx_contacts_customer_id';

-- Check indexes on users table
SELECT 
    indexname, 
    indexdef 
FROM 
    pg_indexes 
WHERE 
    tablename = 'users' 
    AND indexname = 'idx_users_role';

-- Check if the function exists
SELECT 
    routine_name, 
    routine_type 
FROM 
    information_schema.routines 
WHERE 
    routine_name = 'count_pending_offers_by_customer' 
    AND routine_type = 'FUNCTION';

-- Test the function
SELECT * FROM count_pending_offers_by_customer() LIMIT 5; 