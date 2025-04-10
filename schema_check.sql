-- Query to get all tables in the database
SELECT 
    table_schema, 
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
ORDER BY 
    table_schema, 
    table_name;

-- Query to get all columns for all tables
SELECT 
    table_schema,
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
ORDER BY 
    table_schema, 
    table_name, 
    ordinal_position;

-- Query to get primary keys
SELECT
    tc.table_schema, 
    tc.table_name, 
    kc.column_name 
FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kc 
        ON kc.table_name = tc.table_name
        AND kc.table_schema = tc.table_schema
        AND kc.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_schema,
    tc.table_name;

-- Query to get foreign keys
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_schema,
    tc.table_name;

-- Specifically check the offers table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'offers'
ORDER BY 
    ordinal_position; 