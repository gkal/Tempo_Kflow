# Supabase Real-time Implementation Guide

This guide explains how to use real-time functionality with Supabase in our application. The implementation requires no changes to existing form components, as the real-time features work alongside your current code.

## SQL Setup (Already Completed)

The following tables are already enabled for real-time:

```
contact_history
contacts
customers
notifications
offer_details
offer_history
offers
service_categories
service_subcategories
task_history
tasks
units
users
```

If you need to enable real-time for additional tables:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE your_table_name;
```

## Using the Real-time Hook

We've created a custom hook that makes it easy to subscribe to real-time changes:

```tsx
import { useRealtimeSubscription, createFilter } from '@/hooks/useRealtimeSubscription';

// Inside your component
const { status, isConnected } = useRealtimeSubscription(
  {
    table: 'offers', // The table to subscribe to
    filter: 'customer_id=eq.123', // Optional filter
  },
  (payload) => {
    // This function is called whenever data changes
    console.log('Data changed:', payload);
    
    if (payload.eventType === 'INSERT') {
      // A new record was added
      console.log('New record:', payload.new);
    } else if (payload.eventType === 'UPDATE') {
      // A record was updated
      console.log('Updated record:', payload.new);
      console.log('Previous values:', payload.old);
    } else if (payload.eventType === 'DELETE') {
      // A record was deleted
      console.log('Deleted record ID:', payload.old.id);
    }
  },
  [/* dependencies that should trigger re-subscription */]
);
```

## Real-time Status Indicator

You can add a real-time status indicator to any component:

```tsx
import { RealtimeStatus } from '@/components/ui/RealtimeStatus';

// Inside your component's JSX
<RealtimeStatus 
  table="offers"
  filter="customer_id=eq.123" // Optional
/>
```

## Examples

### 1. Adding Real-time to Existing Pages

You don't need to modify your existing form components. Simply add the hook to the parent component that manages the data:

```tsx
// Inside a component like CustomersPage.tsx
function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Fetch data normally with your existing code
  useEffect(() => {
    fetchCustomers();
  }, []);
  
  // Add real-time updates
  useRealtimeSubscription(
    { table: 'customers' },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        setCustomers(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setCustomers(prev => 
          prev.map(customer => 
            customer.id === payload.new.id ? payload.new : customer
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setCustomers(prev => 
          prev.filter(customer => customer.id !== payload.old.id)
        );
      }
    }
  );
  
  // Rest of your component remains unchanged
}
```

### 2. Creating Filtered Subscriptions

You can filter real-time updates to only receive specific changes:

```tsx
// Inside CustomerDetailPage.tsx
function CustomerDetailPage({ customerId }) {
  // ...existing code...
  
  // Subscribe to offers for this customer only
  useRealtimeSubscription(
    { 
      table: 'offers',
      filter: `customer_id=eq.${customerId}`
    },
    (payload) => {
      // Handle updates to this customer's offers
    }
  );
  
  // ...rest of component...
}
```

## Advanced Usage

### Creating Multiple Subscriptions

You can have multiple subscriptions in a single component:

```tsx
// Subscribe to both customers and offers
useRealtimeSubscription(
  { table: 'customers' },
  (payload) => {
    // Handle customer changes
  }
);

useRealtimeSubscription(
  { table: 'offers' },
  (payload) => {
    // Handle offer changes
  }
);
```

### Using the Helper Function for Filters

```tsx
import { createFilter } from '@/hooks/useRealtimeSubscription';

// Create a filter string
const filter = createFilter('status', 'eq', 'active');

// Use it in the subscription
useRealtimeSubscription(
  { table: 'tasks', filter },
  (payload) => {
    // Handle payload
  }
);
```

## Troubleshooting

1. **No real-time updates received**
   - Check that the table is enabled for real-time (see SQL setup)
   - Verify your filter syntax is correct
   - Look at the `status` value returned from the hook

2. **Error: Table not found**
   - Make sure the table name matches exactly what's in the database
   - Table names are case-sensitive

3. **Duplicate updates**
   - Make sure you're not creating multiple subscriptions to the same table
   - Use dependencies array to control when subscriptions are re-created 