-- Add primary_contact_id to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES contacts(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_primary_contact ON customers(primary_contact_id);
