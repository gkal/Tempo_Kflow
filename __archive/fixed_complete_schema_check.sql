-- COMPLETE DATABASE SCHEMA EXTRACTION

-- 1. Get all tables in the public schema
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name;

-- 2. Get all columns for all tables with their properties
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM 
    information_schema.tables t
JOIN 
    information_schema.columns c 
    ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name,
    c.ordinal_position;

-- 3. Get all primary keys
SELECT
    tc.table_name,
    kc.column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints tc
JOIN 
    information_schema.key_column_usage kc 
    ON tc.constraint_name = kc.constraint_name
    AND tc.table_schema = kc.table_schema
WHERE 
    tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_name,
    kc.ordinal_position;

-- 4. Get all foreign keys and references
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    tc.constraint_name
FROM 
    information_schema.table_constraints tc
JOIN 
    information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN 
    information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_name,
    kcu.ordinal_position;

-- 5. Get all check constraints (fixed query)
SELECT
    tc.table_name,
    tc.constraint_name,
    pg_get_constraintdef(pgc.oid) AS check_definition
FROM
    information_schema.table_constraints tc
JOIN
    pg_namespace n ON n.nspname = tc.table_schema
JOIN
    pg_constraint pgc ON pgc.conname = tc.constraint_name AND pgc.connamespace = n.oid
WHERE
    tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
ORDER BY
    tc.table_name,
    tc.constraint_name;

-- 6. Get all unique constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM
    information_schema.table_constraints tc
JOIN
    information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE
    tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
ORDER BY
    tc.table_name,
    tc.constraint_name,
    kcu.ordinal_position;

-- 7. Get all indexes
SELECT
    tablename AS table_name,
    indexname AS index_name,
    indexdef AS index_definition
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename,
    indexname;

-- 8. Get all sequences
SELECT
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM
    information_schema.sequences
WHERE
    sequence_schema = 'public'
ORDER BY
    sequence_name;

-- 9. Get all views
SELECT
    table_name AS view_name,
    view_definition
FROM
    information_schema.views
WHERE
    table_schema = 'public'
ORDER BY
    table_name;

-- 10. Get all triggers
SELECT
    trigger_name,
    event_manipulation,
    event_object_table AS table_name,
    action_timing,
    action_orientation
FROM
    information_schema.triggers
WHERE
    trigger_schema = 'public'
ORDER BY
    event_object_table,
    trigger_name;

-- 11. Get all user defined types
SELECT
    t.typname AS type_name,
    CASE 
        WHEN t.typtype = 'e' THEN 'ENUM'
        WHEN t.typtype = 'c' THEN 'COMPOSITE'
        WHEN t.typtype = 'd' THEN 'DOMAIN'
        WHEN t.typtype = 'r' THEN 'RANGE'
        ELSE t.typtype::text
    END AS type_type,
    CASE
        WHEN t.typtype = 'e' THEN (
            SELECT string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder)
            FROM pg_enum e
            WHERE e.enumtypid = t.oid
        )
        ELSE NULL
    END AS enum_values
FROM
    pg_type t
JOIN
    pg_namespace n ON t.typnamespace = n.oid
WHERE
    n.nspname = 'public'
    AND (t.typtype = 'e' OR t.typtype = 'c' OR t.typtype = 'd' OR t.typtype = 'r')
    AND t.typname NOT LIKE '_%'
ORDER BY
    t.typname;

-- 12. Get all functions
SELECT
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS function_arguments,
    t.typname AS return_type
FROM
    pg_proc p
JOIN
    pg_namespace n ON p.pronamespace = n.oid
JOIN
    pg_type t ON p.prorettype = t.oid
WHERE
    n.nspname = 'public'
ORDER BY
    p.proname,
    pg_get_function_arguments(p.oid);

-- 13. Get specifically the structure of the offers table
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