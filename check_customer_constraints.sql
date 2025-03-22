-- SQL script to examine the constraints on the customers table
-- This will show us the exact definition of the customer_type_check constraint

-- First, get the constraint definition
SELECT conname, pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'customers_customer_type_check';

-- Alternative way to check the constraint
SELECT c.conname AS constraint_name,
       c.contype AS constraint_type,
       pg_get_constraintdef(c.oid) AS constraint_definition,
       t.relname AS table_name
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'customers' AND c.conname LIKE '%customer_type%';

-- Check the columns from information_schema 
SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'customer_type';

-- Also look for any relevant constraints in pg_catalog
SELECT n.nspname as schema_name,
       t.relname as table_name,
       c.conname as constraint_name,
       pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE t.relname = 'customers';

-- Direct query to check all customers in the database by their type
SELECT DISTINCT customer_type, count(*) 
FROM customers 
GROUP BY customer_type
ORDER BY count(*) DESC; 