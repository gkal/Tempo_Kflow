-- Check if an index exists on the customer_type column in the customers table
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'customers'
    AND indexdef LIKE '%customer_type%';

-- Create the index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'customers'
        AND indexdef LIKE '%customer_type%'
    ) THEN
        -- Create an index on customer_type column
        CREATE INDEX idx_customers_customer_type ON customers(customer_type);
        RAISE NOTICE 'Created index idx_customers_customer_type';
    ELSE
        RAISE NOTICE 'Index on customer_type already exists';
    END IF;
END $$;

-- Additional optional check for existing indexes on customers table
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename = 'customers'
ORDER BY
    indexname; 