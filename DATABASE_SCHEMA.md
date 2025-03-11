# Database Schema Reference

This document provides a reference for all tables and their columns in the Supabase database.

## Tables Overview

Based on the information provided, the database contains the following tables:
- `contact_persons`
- `contacts`
- `customers`
- `departments`
- `history_log`
- `notifications`
- `offers`
- `tasks`
- `users`

## Tasks Table

The `tasks` table appears to be missing the `due_date` and `due_date_time` columns that our application is trying to use. When creating tasks, we should be aware of the following:

1. The application attempts to use both `due_date` and `due_date_time` columns
2. Neither column exists in the current database schema
3. We need to either:
   - Add these columns to the database
   - Modify our code to not use these columns

## Code Compatibility

To ensure our code works with the current database schema:

1. For the `createTask` function:
   - Remove references to `due_date` and `due_date_time` until these columns are added to the database
   - Focus on required fields only: title, description, assigned_to, created_by, status

2. For the `TaskDialog` and `TaskItem` components:
   - Update to handle the absence of due date fields
   - Add conditional rendering for due dates

## Adding Missing Columns

If you need to add the missing columns to the database, run the following SQL in the Supabase SQL Editor:

```sql
-- Add due_date column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Add due_date_time column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_date_time TIMESTAMP WITH TIME ZONE;
```

## Development Guidelines

1. Always check the database schema before making changes to the code
2. Use feature flags to control which columns are used
3. Include fallbacks for missing columns
4. Test thoroughly after database schema changes

## Updating the Schema

When the database schema changes:

1. Update this document
2. Run the `npm run update-schema` script
3. Update any affected components
4. Test the application thoroughly 