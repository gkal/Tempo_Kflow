-- SQL script to fix the customer query issue

-- Check if the fullname column exists in the customers table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'customers'
        AND column_name = 'fullname'
    ) THEN
        -- Add the fullname column if it doesn't exist
        ALTER TABLE customers
        ADD COLUMN fullname TEXT GENERATED ALWAYS AS (company_name) STORED;
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON customers TO authenticated; 