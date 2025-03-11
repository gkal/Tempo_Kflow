CREATE OR REPLACE FUNCTION copy_due_date_time_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Copy data from due_date to due_date_time
  UPDATE tasks
  SET due_date_time = due_date
  WHERE due_date IS NOT NULL AND due_date_time IS NULL;
END;
$$; 