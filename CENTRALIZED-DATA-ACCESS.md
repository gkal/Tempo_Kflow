# Centralized Data Access Implementation

## Introduction

To address the requirement of having a single point of control for all database operations, we've implemented a centralized data access layer. This approach ensures that all create, read, update, and delete operations go through a unified interface, which provides several critical benefits:

## Key Benefits

1. **Single Point of Control**: All database interactions happen through one service, eliminating redundant code and ensuring consistency.

2. **Type Safety**: Full TypeScript support ensures proper typing for all database operations, reducing runtime errors.

3. **Built-in Soft Deletion**: Tables with soft-delete support have automatic filtering of deleted records and standardized restore functionality.

4. **Audit Logging**: Comprehensive change tracking captures who made changes, when they occurred, and what was modified.

5. **Consistent Error Handling**: Standardized error responses make error handling predictable across the application.

6. **Reusability**: Common operations like filtering, pagination, and search are implemented once and available everywhere.

7. **Future-Proofing**: Changes to database structure or operations only need to be updated in one place.

## Implementation

The implementation includes:

1. `DataService` class: A generic service providing CRUD operations with rich features like filtering, sorting, and pagination.

2. Type-specific services: Pre-configured instances for each table in the database.

3. React hooks: The `useDataService` hook simplifies data access in React components with built-in loading/error state.

## Usage Examples

### Basic CRUD Operations

```tsx
import { db } from '@/database';

// Create
const { data: newCustomer } = await db.customers.create({
  company_name: 'New Company',
  email: 'contact@example.com'
});

// Read
const { data: customer } = await db.customers.getById('123');

// Update
const { data: updatedCustomer } = await db.customers.update('123', {
  company_name: 'Updated Name'
});

// Delete (soft)
const { error } = await db.customers.softDelete('123');

// Restore
const { data: restoredCustomer } = await db.customers.restore('123');
```

### In React Components

```tsx
import { useEffect } from 'react';
import { useDataService } from '@/hooks';
import type { Customer } from '@/services/api/types';

function CustomerComponent() {
  const { 
    data: customers, 
    loading, 
    error, 
    fetchAll, 
    create 
  } = useDataService<Customer>('customers');
  
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  
  const handleAddCustomer = () => {
    create({
      company_name: 'New Customer',
      email: 'contact@example.com'
    });
  };
  
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleAddCustomer}>Add Customer</button>
      <ul>
        {customers?.map(customer => (
          <li key={customer.id}>{customer.company_name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Migration Strategy

To migrate existing code to use this centralized data access layer:

1. Identify direct Supabase client usage in components
2. Replace direct database calls with the appropriate `db.[table]` methods
3. For React components, consider using the `useDataService` hook
4. Test thoroughly after changes

## Documentation

See the following resources for more information:

- `src/database/README.md` - Detailed documentation on using the data service
- `src/database/examples/CustomerDataExample.tsx` - Example component using the data service
- `src/hooks/useDataService.ts` - Documentation for the React hook

## Benefits of This Approach

This centralized data access approach directly addresses the requirements by:

1. **Preventing Mistakes**: All operations go through a single point with consistent validation and error handling.
2. **Improving Code Quality**: Eliminates redundant database access code throughout the application.
3. **Enabling Consistent Auditing**: Every change is logged with user information and change details.
4. **Supporting Soft Deletion**: Standardized approach to soft deletion and restoration.
5. **Simplifying Development**: Developers don't need to worry about the complexities of database operations.

## Next Steps

1. Convert existing components to use this centralized data access layer
2. Add automated tests for data service methods
3. Create additional specialized hooks for common data access patterns 