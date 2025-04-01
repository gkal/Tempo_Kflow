# Database Service

This module provides a centralized data access layer for the application. It's designed to:

1. Create a single, consistent interface for all database operations
2. Ensure type safety for all operations
3. Handle soft deletion and auditing consistently
4. Simplify error handling and state management
5. Prevent duplicate code across the application

## Basic Usage

All database operations should go through the `db` object, which provides access to services for each table:

```tsx
import { db } from '@/database';

// Get all active customers
const { data, error } = await db.customers.getAll();

// Get a specific customer by ID
const { data, error } = await db.customers.getById('123');

// Create a new customer
const { data, error } = await db.customers.create({
  company_name: 'New Company',
  email: 'contact@example.com'
});

// Update a customer
const { data, error } = await db.customers.update('123', {
  company_name: 'Updated Name'
});

// Soft delete a customer
const { error } = await db.customers.softDelete('123');

// Restore a deleted customer
const { error } = await db.customers.restore('123');
```

## React Integration with Hooks

For React components, use the `useDataService` hook, which provides a simplified interface with built-in loading and error state management:

```tsx
import { useEffect } from 'react';
import { useDataService } from '@/hooks/useDataService';
import type { Customer } from '@/services/api/types';

function CustomersList() {
  const { 
    data: customers, 
    loading, 
    error, 
    fetchAll,
    search 
  } = useDataService<Customer>('customers');

  // Load customers when component mounts
  useEffect(() => {
    fetchAll({
      order: { column: 'company_name', ascending: true },
      limit: 50
    });
  }, [fetchAll]);

  // Handle search
  const handleSearch = (term: string) => {
    if (term.length > 2) {
      search(term, ['company_name', 'email']);
    } else {
      fetchAll();
    }
  };

  return (
    <div>
      <input 
        type="text" 
        placeholder="Search..." 
        onChange={(e) => handleSearch(e.target.value)} 
      />
      
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      
      <ul>
        {customers?.map(customer => (
          <li key={customer.id}>{customer.company_name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Realtime Data Updates

For components that need to stay in sync with database changes, use the `useRealtimeData` hook:

```tsx
import { useRealtimeData } from '@/hooks';
import type { Customer } from '@/services/api/types';

function RealtimeCustomersList() {
  const { 
    data: customers, 
    loading, 
    error 
  } = useRealtimeData<Customer>('customers', {
    order: { column: 'company_name', ascending: true },
    limit: 50,
    // Optional: specify which events to listen for
    events: ['INSERT', 'UPDATE', 'DELETE']
  });

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      
      <ul>
        {customers?.map(customer => (
          <li key={customer.id}>{customer.company_name}</li>
        ))}
      </ul>
    </div>
  );
}
```

This hook will automatically:
1. Load the initial data
2. Subscribe to database changes
3. Update the UI when data changes occur (inserts, updates, deletes)
4. Clean up subscriptions when the component unmounts

### Configuring Supabase for Realtime

To enable realtime updates in Supabase:

1. In the Supabase dashboard, go to **Database** → **Replication**
2. Enable replication for the tables you want to receive realtime updates for
3. Set the appropriate security policies to control access

You can also configure the level of realtime events in your `supabase/config.toml`:

```toml
[realtime]
enabled = true

[[realtime.tables]]
name = "customers"
broadcasts = ["insert", "update", "delete"]

[[realtime.tables]]
name = "offers"
broadcasts = ["insert", "update", "delete"]
```

## Advanced Features

### Filtering and Sorting

```tsx
// Get customers with filtering and sorting
const { data } = await db.customers.getAll({
  filters: {
    // Basic equality filter
    is_active: true,
    
    // Complex filters
    created_at: { gt: '2023-01-01T00:00:00Z' },
    
    // Array filters
    status: ['active', 'pending']
  },
  order: { column: 'created_at', ascending: false },
  limit: 20
});
```

### Pagination

```tsx
// Get paginated results
const { data: firstPage } = await db.customers.getAll({
  limit: 10,
  page: 0
});

const { data: secondPage } = await db.customers.getAll({
  limit: 10,
  page: 1
});

// Or use range-based pagination
const { data } = await db.customers.getAll({
  range: { from: 20, to: 29 }
});
```

### Search

```tsx
// Search across multiple fields
const { data } = await db.customers.search(
  'acme',
  ['company_name', 'email', 'contact_name'],
  {
    order: { column: 'company_name', ascending: true },
    additionalFilters: { is_active: true }
  }
);
```

### Joined Queries

```tsx
// Get customers with their contacts
const { data } = await db.customers.getWithJoins(
  `*, contacts(*)`,
  {
    filters: { is_active: true },
    limit: 10
  }
);
```

### Counting Records

```tsx
// Count records with filters
const { data: count } = await db.customers.count({
  filters: { is_active: true }
});
```

### Custom RPC Functions

```tsx
// Call a custom database function
const { data } = await db.customers.executeRpc('get_customer_statistics', {
  customer_id: '123'
});
```

## Soft Deletion

By default, all query methods filter out soft-deleted records (those with a non-null `deleted_at` field). 
To include deleted records:

```tsx
// Include soft-deleted records
const { data } = await db.customers.getAll({
  includeDeleted: true
});
```

## Audit Logging

For tables with history tracking enabled, every operation (create, update, delete, restore) is 
automatically logged to the associated history table with:

- User ID (from session storage)
- Timestamp
- Old values
- New values
- Operation type
- Browser info

This creates a detailed audit trail of all data changes in the system.

## Error Handling

All methods return a consistent response format:

```ts
interface DbResponse<T> {
  data: T | null;
  error: Error | null;
  status: 'success' | 'error';
}
```

This makes error handling consistent throughout the application:

```tsx
const { data, error } = await db.customers.getById('123');

if (error) {
  console.error('Error fetching customer:', error.message);
  return;
}

// Process data
console.log('Customer:', data);
```

### Localized Error Messages

The data service supports error message localization. You can specify the language for error messages in any operation:

```tsx
// Get error messages in Greek
const { data, error } = await db.customers.create(
  {
    company_name: 'New Company',
    email: 'invalid-email' // This will cause a validation error
  },
  { language: 'el' } // Request Greek error messages
);

if (error) {
  // Error message will be in Greek, e.g.
  // "Μη έγκυρη σύνταξη εισόδου για τύπο"
  showErrorToast(error.message);
}
```

This works for all operations:

```tsx
// Examples of operations with Greek error messages
await db.customers.getById('123', { language: 'el' });
await db.customers.update('123', { /* data */ }, { language: 'el' });
await db.customers.softDelete('123', { language: 'el' });
await db.customers.search('search term', ['field1', 'field2'], { language: 'el' });
```

You can also set a default language for all requests in your components:

```tsx
function CustomerForm() {
  // Use a constant for all database operations
  const language = 'el';
  
  const handleSubmit = async (formData) => {
    const { error } = await db.customers.create(formData, { language });
    if (error) {
      // Error will be in Greek
      setErrorMessage(error.message);
    }
  };
  
  // ...
}
```

## Available Tables

- `customers` - Company/organization records
- `contacts` - Individual contacts associated with customers
- `contactPositions` - Job titles/positions for contacts
- `departments` - Internal departments
- `offers` - Customer offers/proposals
- `offerDetails` - Line items within offers
- `tasks` - To-do items and activities
- `taskHistory` - Audit logs for task changes
- `users` - System users
- `serviceCategories` - High-level service categories
- `serviceSubcategories` - Detailed service subcategories
- `units` - Measurement units (hours, pieces, etc.)
- `notifications` - User notifications
- `offerHistory` - Audit logs for offer changes