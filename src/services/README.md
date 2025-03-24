# K-Flow Services

This directory contains service modules that provide centralized functionality for the K-Flow application.

## API Services

The `api` directory contains services for interacting with the Supabase backend database. These services provide a consistent interface for database operations across the application.

### Supabase Service

The `supabaseService.ts` file provides a comprehensive API for performing CRUD operations on the Supabase database. It offers several benefits:

1. **Centralized Database Logic**: All database access is handled through a single service layer, making it easier to maintain and update.
2. **Consistent Error Handling**: Standardized approach to error handling with detailed error messages.
3. **Type Safety**: TypeScript interfaces ensure database operations are type-safe.
4. **Self-Documenting Code**: Rich JSDoc comments with examples make the API easy to use.

#### Available Functions

| Function | Description | 
|----------|-------------|
| `fetchRecords` | Retrieve multiple records with optional filtering and sorting |
| `fetchRecordById` | Retrieve a single record by its ID |
| `createRecord` | Create a new record in the database |
| `updateRecord` | Update an existing record |
| `deleteRecord` | Permanently delete a record |
| `softDeleteRecord` | Mark a record as deleted without removing it from the database |
| `fetchJoinedRecords` | Fetch records with related data from multiple tables |
| `searchRecords` | Search for records across multiple fields |
| `countRecords` | Count records matching specific criteria |

#### Usage Example

```typescript
import { fetchRecords, createRecord, updateRecord } from '@/services/api/supabaseService';
import type { Customer } from '@/services/api/types';

// Fetch all active customers
const fetchCustomers = async () => {
  const { data, error } = await fetchRecords<Customer>('customers', {
    filters: { is_active: true },
    order: { column: 'name', ascending: true }
  });
  
  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  
  return data;
};

// Create a new customer
const addCustomer = async (customerData: Partial<Customer>) => {
  const { data, error } = await createRecord<Customer>('customers', customerData);
  
  if (error) {
    console.error('Error creating customer:', error);
    return null;
  }
  
  return data;
};

// Update a customer
const updateCustomer = async (id: string, changes: Partial<Customer>) => {
  const { data, error } = await updateRecord<Customer>('customers', id, changes);
  
  if (error) {
    console.error('Error updating customer:', error);
    return false;
  }
  
  return true;
};
```

### Database Types

The `types.ts` file contains TypeScript interfaces that represent the database schema. These types ensure type safety when working with database operations.

Key types include:

- `TableName`: Union type of all available table names
- `DbResponse`: Generic response type for all database operations
- Entity interfaces: `Customer`, `Contact`, `Offer`, etc.

#### Usage Example

```typescript
import { DbResponse, Customer, TableName } from '@/services/api/types';

// Type-safe function that works with customers
function processCustomer(customer: Customer): void {
  // Type-safe access to customer properties
  console.log(`Processing ${customer.name}`);
}

// Type-safe table name usage
const customersTable: TableName = 'customers';
```

## Using the Service Layer

When implementing new features or updating existing components, prefer using the API service layer instead of direct Supabase client usage. This ensures consistency across the application and simplifies future updates to the database logic.

### Benefits of Using the Service Layer

1. **Simplified Component Code**: Components can focus on UI logic instead of database operations
2. **Consistent Error Handling**: Standardized approach to handling database errors
3. **Easier Testing**: Service functions can be mocked for unit testing
4. **Future-Proofing**: If the backend changes, only the service layer needs to be updated

### Migrating Existing Code

When updating existing components, look for direct usage of `supabase` client and replace with the appropriate service function. For example:

Before:
```typescript
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('is_active', true)
  .order('name');
```

After:
```typescript
const { data, error } = await fetchRecords<Customer>('customers', {
  filters: { is_active: true },
  order: { column: 'name' }
});
``` 