-- This script updates the customer_type constraint to allow all required values
-- First, check the current constraint definition
SELECT pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'customers_customer_type_check';

-- Check values that currently exist in database
SELECT DISTINCT customer_type
FROM customers
ORDER BY customer_type;

-- Drop the existing constraint 
ALTER TABLE customers DROP CONSTRAINT customers_customer_type_check;

-- Add the new constraint with all required values based on what's in the database
ALTER TABLE customers ADD CONSTRAINT customers_customer_type_check 
CHECK (customer_type IN (
  'Δημόσιο',
  'Εταιρεία', 
  'Ιδιώτης',
  'Οικοδομές',
  'Εκτακτος',  -- Add this value from the image
  'company', 'individual', 'public', 'construction' -- Keep English versions for backward compatibility
));

-- Update any existing records with uppercase to lowercase versions
UPDATE customers
SET customer_type = 'Εκτακτος πελάτης'
WHERE customer_type = 'Εκτακτος Πελάτης';

-- Update any existing records with uppercase to lowercase versions
UPDATE customers
SET customer_type = 'Εκτακτη εταιρία'
WHERE customer_type = 'Εκτακτη Εταιρία';

-- Verify the constraint was updated correctly
SELECT pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'customers_customer_type_check';

-- If you want to be more selective, use this constraint instead:
-- This will include only the lowercase versions
/*
ALTER TABLE customers ADD CONSTRAINT customers_customer_type_check 
CHECK (customer_type IN (
  'Δημόσιο',
  'Εταιρεία', 
  'Ιδιώτης',
  'Οικοδομές',
  'Εκτακτος πελάτης',
  'Εκτακτη εταιρία'
));
*/ 