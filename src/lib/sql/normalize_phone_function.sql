-- Function to normalize phone numbers in PostgreSQL/Supabase
-- Extracts only the first 10 digits from a phone number, removing any non-numeric characters
-- This provides consistent matching regardless of formatting or annotations

-- Usage example: 
-- SELECT * FROM customers WHERE normalize_phone(telephone) = normalize_phone('6985-50.50');

CREATE OR REPLACE FUNCTION normalize_phone(phone_text TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- Extract only digits and take the first 10
  -- This handles special formatting, extensions, and annotations
  RETURN SUBSTRING(REGEXP_REPLACE(phone_text, '[^0-9]', '', 'g'), 1, 10);
END;
$$ LANGUAGE plpgsql;

-- OPTIONAL: Create an index to improve search performance if needed
-- This is recommended only when phone searches are frequent
-- CREATE INDEX idx_customers_normalized_phone ON customers (normalize_phone(telephone));

-- OPTIONAL: Add a normalized_phone column for even better performance
-- This requires updating the column whenever the phone number changes
-- 
-- ALTER TABLE customers ADD COLUMN normalized_phone TEXT;
-- 
-- UPDATE customers SET normalized_phone = normalize_phone(telephone);
-- 
-- CREATE INDEX idx_customers_normalized_phone ON customers (normalized_phone);
-- 
-- -- Create a trigger to keep normalized_phone updated
-- CREATE OR REPLACE FUNCTION update_normalized_phone()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.normalized_phone := normalize_phone(NEW.telephone);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- CREATE TRIGGER trg_update_normalized_phone
-- BEFORE INSERT OR UPDATE ON customers
-- FOR EACH ROW
-- EXECUTE FUNCTION update_normalized_phone(); 