-- Update equipment_items table to change dates_available to integer
-- This allows storing the maximum number of days available instead of a timestamp

-- Check if dates_available column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'equipment_items' 
        AND column_name = 'dates_available'
    ) THEN
        -- Drop existing column constraint if any
        ALTER TABLE equipment_items 
        ALTER COLUMN dates_available DROP DEFAULT,
        ALTER COLUMN dates_available DROP NOT NULL;
        
        -- Change column type to integer
        ALTER TABLE equipment_items 
        ALTER COLUMN dates_available TYPE integer 
        USING (
            CASE 
                WHEN dates_available IS NULL THEN NULL 
                ELSE 7 -- Default to 7 days for existing records
            END
        );
        
        -- Add comment to explain the column's purpose
        COMMENT ON COLUMN equipment_items.dates_available IS 'Maximum number of days that equipment can be available';
    END IF;
END $$;
