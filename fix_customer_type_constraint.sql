-- Check what the current constraint definition is
SELECT pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'customers_customer_type_check';

-- Check all distinct customer types in the database
SELECT DISTINCT customer_type, COUNT(*) as count
FROM customers
GROUP BY customer_type
ORDER BY customer_type;

-- Fix any mismatched data before changing constraint
-- For any foreign/unrecognized values, set them to 'Εταιρεία,'
UPDATE customers
SET customer_type = 'Εταιρεία,'
WHERE customer_type NOT IN ('Εταιρεία,', 'Ιδιώτης,', 'Δημόσιο,', 'Οικοδομές', 'Εκτακτος');

-- Drop the existing constraint
ALTER TABLE customers DROP CONSTRAINT customers_customer_type_check;

-- Add the new constraint with ALL needed values
ALTER TABLE customers ADD CONSTRAINT customers_customer_type_check 
CHECK (customer_type IN (
  'Εταιρεία,', 
  'Ιδιώτης,', 
  'Δημόσιο,', 
  'Οικοδομές', 
  'Εκτακτος',
  'Εκτακτος πελάτης',
  'Εκτακτη εταιρία'
));

-- Verify the new constraint
SELECT pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'customers_customer_type_check';

-- Check all customer types again to confirm they match the constraint
SELECT DISTINCT customer_type, COUNT(*) as count
FROM customers
GROUP BY customer_type
ORDER BY customer_type; 