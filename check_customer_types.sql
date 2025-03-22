-- SQL script to discover allowed customer_type values

-- 1. First, get the constraint definition to see exactly what's accepted
SELECT conname, pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'customers_customer_type_check';

-- 2. Check existing data in the database
SELECT customer_type, COUNT(*) as count
FROM customers
GROUP BY customer_type
ORDER BY count DESC;

-- 3. Test a batch insert to see which values are accepted and which are rejected
DO $$
DECLARE
  test_result RECORD;
  success BOOLEAN;
BEGIN
  -- List of customer types to test
  RAISE NOTICE 'Testing customer types...';
  
  -- Try "Εταιρεία"
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 1', '1234567890', 'Εταιρεία', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Εταιρεία"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Εταιρεία": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try "Ιδιώτης"
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 2', '1234567890', 'Ιδιώτης', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Ιδιώτης"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Ιδιώτης": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try "Δημόσιο"
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 3', '1234567890', 'Δημόσιο', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Δημόσιο"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Δημόσιο": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try "Οικοδομές"
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 4', '1234567890', 'Οικοδομές', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Οικοδομές"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Οικοδομές": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try "Εκτακτος πελάτης" (lowercase π)
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 5', '1234567890', 'Εκτακτος πελάτης', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Εκτακτος πελάτης"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Εκτακτος πελάτης": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try "Εκτακτος Πελάτης" (uppercase Π)
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 6', '1234567890', 'Εκτακτος Πελάτης', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Εκτακτος Πελάτης"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Εκτακτος Πελάτης": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try "Εκτακτη εταιρία" (lowercase ε)
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 7', '1234567890', 'Εκτακτη εταιρία', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Εκτακτη εταιρία"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Εκτακτη εταιρία": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try "Εκτακτη Εταιρία" (uppercase Ε)
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 8', '1234567890', 'Εκτακτη Εταιρία', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Εκτακτη Εταιρία"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Εκτακτη Εταιρία": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try "Έκτακτος πελάτης" (with accent on first Ε - Έκτακτος)
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 9', '1234567890', 'Έκτακτος πελάτης', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "Έκτακτος πελάτης"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "Έκτακτος πελάτης": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
  
  -- Try a completely different value
  success := TRUE;
  BEGIN
    INSERT INTO customers (company_name, telephone, customer_type, status)
    VALUES ('Test Company 10', '1234567890', 'New Customer Type', 'active')
    RETURNING id INTO test_result;
    RAISE NOTICE 'Success with "New Customer Type"';
  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    RAISE NOTICE 'Failed with "New Customer Type": %', SQLERRM;
  END;
  
  -- Cleanup 
  IF success THEN
    DELETE FROM customers WHERE id = test_result.id;
  END IF;
END $$;

-- This script tests which customer types are allowed by the database
-- It will help diagnose issues with the check constraint

-- Let's create a function to safely test insertions
CREATE OR REPLACE FUNCTION test_customer_type_insertion() RETURNS void AS $$
DECLARE
  test_id text;
BEGIN
  -- First, check the current constraint
  RAISE NOTICE 'Current constraint definition:';
  FOR test_id IN (
    SELECT pg_get_constraintdef(oid) AS constraint_definition
    FROM pg_constraint 
    WHERE conname = 'customers_customer_type_check'
  ) LOOP
    RAISE NOTICE '%', test_id;
  END LOOP;
  
  -- Check which customer types already exist
  RAISE NOTICE 'Existing customer types:';
  FOR test_id IN (
    SELECT DISTINCT customer_type
    FROM customers
    ORDER BY customer_type
  ) LOOP
    RAISE NOTICE '%', test_id;
  END LOOP;
  
  -- Test "Εταιρεία" (known to work)
  BEGIN
    INSERT INTO customers(company_name, afm, customer_type, status)
    VALUES ('Test Company 1', '12345678', 'Εταιρεία', 'active')
    RETURNING id;
    
    RAISE NOTICE 'Success with "Εταιρεία"';
    ROLLBACK;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Failed with "Εταιρεία": %', SQLERRM;
      ROLLBACK;
  END;
  
  -- Test "Ιδιώτης" (known to work)
  BEGIN
    INSERT INTO customers(company_name, afm, customer_type, status)
    VALUES ('Test Company 2', '12345678', 'Ιδιώτης', 'active')
    RETURNING id;
    
    RAISE NOTICE 'Success with "Ιδιώτης"';
    ROLLBACK;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Failed with "Ιδιώτης": %', SQLERRM;
      ROLLBACK;
  END;
  
  -- Test "Δημόσιο" (known to work)
  BEGIN
    INSERT INTO customers(company_name, afm, customer_type, status)
    VALUES ('Test Company 3', '12345678', 'Δημόσιο', 'active')
    RETURNING id;
    
    RAISE NOTICE 'Success with "Δημόσιο"';
    ROLLBACK;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Failed with "Δημόσιο": %', SQLERRM;
      ROLLBACK;
  END;
  
  -- Test "Οικοδομές" (known to work)
  BEGIN
    INSERT INTO customers(company_name, afm, customer_type, status)
    VALUES ('Test Company 4', '12345678', 'Οικοδομές', 'active')
    RETURNING id;
    
    RAISE NOTICE 'Success with "Οικοδομές"';
    ROLLBACK;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Failed with "Οικοδομές": %', SQLERRM;
      ROLLBACK;
  END;
  
  -- Try "Εκτακτος πελάτης" (lowercase π)
  BEGIN
    INSERT INTO customers(company_name, afm, customer_type, status)
    VALUES ('Test Company 5', '12345678', 'Εκτακτος πελάτης', 'active')
    RETURNING id;
    
    RAISE NOTICE 'Success with "Εκτακτος πελάτης"';
    ROLLBACK;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Failed with "Εκτακτος πελάτης": %', SQLERRM;
      ROLLBACK;
  END;
  
  -- Try "Εκτακτος Πελάτης" (uppercase Π)
  BEGIN
    INSERT INTO customers(company_name, afm, customer_type, status)
    VALUES ('Test Company 6', '12345678', 'Εκτακτος Πελάτης', 'active')
    RETURNING id;
    
    RAISE NOTICE 'Success with "Εκτακτος Πελάτης"';
    ROLLBACK;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Failed with "Εκτακτος Πελάτης": %', SQLERRM;
      ROLLBACK;
  END;
  
  -- Try "Εκτακτη εταιρία" (lowercase ε)
  BEGIN
    INSERT INTO customers(company_name, afm, customer_type, status)
    VALUES ('Test Company 7', '12345678', 'Εκτακτη εταιρία', 'active')
    RETURNING id;
    
    RAISE NOTICE 'Success with "Εκτακτη εταιρία"';
    ROLLBACK;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Failed with "Εκτακτη εταιρία": %', SQLERRM;
      ROLLBACK;
  END;
  
  -- Try "Εκτακτη Εταιρία" (uppercase Ε)
  BEGIN
    INSERT INTO customers(company_name, afm, customer_type, status)
    VALUES ('Test Company 8', '12345678', 'Εκτακτη Εταιρία', 'active')
    RETURNING id;
    
    RAISE NOTICE 'Success with "Εκτακτη Εταιρία"';
    ROLLBACK;
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Failed with "Εκτακτη Εταιρία": %', SQLERRM;
      ROLLBACK;
  END;
  
  -- Print exact character codes
  RAISE NOTICE '--- Character Codes ---';
  RAISE NOTICE 'Εταιρεία: %', (SELECT array_to_string(array_agg(code), ' ') FROM (SELECT ascii(unnest(string_to_array('Εταιρεία', NULL))) as code) as t);
  RAISE NOTICE 'Εκτακτος πελάτης: %', (SELECT array_to_string(array_agg(code), ' ') FROM (SELECT ascii(unnest(string_to_array('Εκτακτος πελάτης', NULL))) as code) as t);
  RAISE NOTICE 'Εκτακτη εταιρία: %', (SELECT array_to_string(array_agg(code), ' ') FROM (SELECT ascii(unnest(string_to_array('Εκτακτη εταιρία', NULL))) as code) as t);
END;
$$ LANGUAGE plpgsql;

-- Call the function
SELECT test_customer_type_insertion();

-- Clean up
DROP FUNCTION IF EXISTS test_customer_type_insertion(); 