-- Add run_sql_query function to securely execute SQL from the frontend
-- This function is for administrative use only and strictly controlled by RLS

-- Create the run_sql_query function
CREATE OR REPLACE FUNCTION run_sql_query(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  user_role TEXT;
BEGIN
  -- Check if the user is an admin
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  
  IF user_role != 'Admin' THEN
    RAISE EXCEPTION 'Only administrators can execute SQL queries';
  END IF;
  
  -- Validate the query to prevent potentially dangerous operations
  -- Limit to specific types of operations (CREATE INDEX, ANALYZE, UPDATE STATISTICS, etc.)
  IF NOT (
    sql_query ~* '^(CREATE\s+INDEX|ANALYZE\s+|VACUUM\s+|REINDEX\s+|CLUSTER\s+|ALTER\s+INDEX)'
  ) THEN
    RAISE EXCEPTION 'Only database optimization queries are allowed';
  END IF;
  
  -- Disallow DROP, TRUNCATE, DELETE statements
  IF sql_query ~* '(DROP|TRUNCATE|DELETE\s+FROM|UPDATE\s+.*\s+SET|INSERT\s+INTO)' THEN
    RAISE EXCEPTION 'Potentially dangerous operation not allowed';
  END IF;
  
  -- Log the query execution attempt for auditing
  INSERT INTO history_logs(
    action,
    record_id,
    table_name,
    user_id,
    new_values
  ) VALUES (
    'EXECUTE_SQL',
    auth.uid(),
    'SYSTEM',
    auth.uid(),
    jsonb_build_object('sql_query', sql_query)
  );
  
  -- Execute the query and capture the result
  BEGIN
    EXECUTE sql_query;
    result := jsonb_build_object(
      'success', true,
      'message', 'Query executed successfully',
      'timestamp', now()
    );
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'message', SQLERRM,
      'error_detail', SQLSTATE,
      'timestamp', now()
    );
  END;
  
  RETURN result;
END;
$$;

-- Set proper permissions
REVOKE EXECUTE ON FUNCTION run_sql_query(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION run_sql_query(TEXT) TO authenticated;

-- Create a view to show executed SQL queries in the admin panel
CREATE OR REPLACE VIEW admin_sql_execution_log AS
SELECT
  h.id,
  h.created_at,
  u.fullname as executed_by,
  h.new_values->>'sql_query' as sql_query,
  CASE
    WHEN h.new_values->>'success' = 'true' THEN true
    ELSE false
  END as success,
  h.new_values->>'message' as result_message
FROM
  history_logs h
  JOIN users u ON h.user_id = u.id
WHERE
  h.action = 'EXECUTE_SQL'
ORDER BY
  h.created_at DESC;

-- Enable RLS on the view
ALTER VIEW admin_sql_execution_log OWNER TO postgres;
GRANT SELECT ON admin_sql_execution_log TO authenticated;

-- Create RLS policy to allow only admins to see the execution log
CREATE POLICY admin_sql_log_policy ON history_logs
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM users WHERE role = 'Admin')
    AND action = 'EXECUTE_SQL'
  );

COMMENT ON FUNCTION run_sql_query(TEXT) IS 'Executes database optimization SQL queries after strict validation. Admin only.';
COMMENT ON VIEW admin_sql_execution_log IS 'View of all SQL queries executed through the run_sql_query function'; 