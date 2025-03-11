CREATE OR REPLACE FUNCTION copy_due_date_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Copy data from due_date_time to due_date
  UPDATE tasks
  SET due_date = due_date_time
  WHERE due_date_time IS NOT NULL AND due_date IS NULL;
END;
$$; 