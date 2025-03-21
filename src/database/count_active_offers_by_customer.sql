-- Function to count active offers for a given set of customers
-- This helps optimize database queries by doing aggregation in the database
CREATE OR REPLACE FUNCTION count_active_offers_by_customer(customer_ids uuid[])
RETURNS TABLE (customer_id uuid, count bigint) 
LANGUAGE SQL
AS $$
  SELECT 
    customer_id,
    COUNT(*) as count
  FROM 
    offers
  WHERE 
    customer_id = ANY(customer_ids)
    AND deleted_at IS NULL
    AND (
      result IS NULL 
      OR result = 'pending' 
      OR result = '' 
      OR result = 'none'
    )
  GROUP BY 
    customer_id;
$$; 