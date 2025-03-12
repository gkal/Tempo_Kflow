-- SQL script to remove foreign key constraints from offer_history table

-- First, identify the constraint name for previous_assigned_to
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'offer_history'::regclass
    AND conname LIKE '%previous_assigned_to%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE offer_history DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for previous_assigned_to';
    END IF;
END $$;

-- Also remove constraint for new_assigned_to if it exists
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'offer_history'::regclass
    AND conname LIKE '%new_assigned_to%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE offer_history DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for new_assigned_to';
    END IF;
END $$;

-- Direct approach if the constraint names are known
ALTER TABLE IF EXISTS offer_history DROP CONSTRAINT IF EXISTS offer_history_previous_assigned_to_fkey;
ALTER TABLE IF EXISTS offer_history DROP CONSTRAINT IF EXISTS offer_history_new_assigned_to_fkey;

-- Modify the columns to remove the references
ALTER TABLE offer_history 
ALTER COLUMN previous_assigned_to DROP NOT NULL,
ALTER COLUMN new_assigned_to DROP NOT NULL; 