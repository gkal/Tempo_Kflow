CREATE OR REPLACE FUNCTION add_due_date_column()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add due_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'due_date'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE tasks ADD COLUMN due_date TIMESTAMPTZ;
  END IF;
END;
$$; 