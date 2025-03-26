# Conversion Guide: Migrating to TanStack Table Virtualization

This guide provides step-by-step instructions for converting existing data tables to use our new TanStack Table virtualization system. The new system offers significant performance improvements for handling large datasets, better mobile responsiveness, and improved accessibility.

## Prerequisites

- Ensure you have installed the required packages:
  - `@tanstack/react-table`
  - `@tanstack/react-virtual`

## Migration Steps

### 1. Identify the Existing Table Component

Start by identifying the current table component you want to convert. Look for:
- The main component file
- Any custom hooks used for data fetching
- Column definitions
- State management for filters, sorting, etc.

### 2. Create a New Component File

Create a new component file using the naming convention:
```
Virtual[EntityName]Table.tsx
```

For example:
- `CustomersTable.tsx` → `VirtualCustomersTable.tsx`
- `ProductsTable.tsx` → `VirtualProductsTable.tsx`

### 3. Set Up Initial Imports and Interfaces

Begin with the necessary imports:

```tsx
import React, { useState, useCallback, useMemo } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { TableWrapper } from "@/components/ui/virtual-table/TableWrapper";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
// ... other imports as needed
```

Define your data interfaces:

```tsx
export interface YourEntityType {
  id: string;
  // ... other fields
}

export interface YourEntityFilters {
  searchTerm: string;
  // ... other filter fields
}
```

### 4. Create the Data Fetching Function

Define a function that will be used to fetch data:

```tsx
const fetchData = useCallback(async ({ 
  pageIndex, 
  pageSize, 
  filters 
}: { 
  pageIndex: number; 
  pageSize: number; 
  filters: YourEntityFilters 
}) => {
  try {
    // Create the base query
    let query = supabase
      .from('your_table')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (filters.searchTerm) {
      query = query.ilike('name', `%${filters.searchTerm}%`);
    }
    
    // Add pagination
    const start = pageIndex * pageSize;
    const end = start + pageSize - 1;
    query = query.range(start, end);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // Process data if needed
    
    return {
      data: data || [],
      totalCount: count || 0
    };
  } catch (err) {
    console.error('Error fetching data:', err);
    
    // Return empty data on error
    return {
      data: [],
      totalCount: 0
    };
  }
}, []);
```

### 5. Define Table Columns

Use the column helper to define your columns:

```tsx
const columnHelper = createColumnHelper<YourEntityType>();

const columns = useMemo<ColumnDef<YourEntityType>[]>(() => [
  // Simple column
  columnHelper.accessor('name', {
    header: 'Name',
  }),
  
  // Custom cell rendering
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'active' ? 'success' : 'danger'}>
        {row.original.status}
      </Badge>
    ),
  }),
  
  // Actions column
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button onClick={() => handleEdit(row.original)}>Edit</Button>
      </div>
    ),
  }
], [handleEdit]);
```

### 6. Implement Expandable Rows (if needed)

If your table requires expandable rows:

```tsx
// State for expanded rows
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

// Toggle row expansion
const handleToggleExpand = useCallback((id: string) => {
  setExpandedIds(prev => {
    const newSet = new Set(prev);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return newSet;
  });
}, []);

// Check if row is expanded
const isRowExpanded = useCallback((id: string) => {
  return expandedIds.has(id);
}, [expandedIds]);

// Function to render expanded content
const renderExpanded = useCallback((item: YourEntityType) => (
  <div className="p-4">
    {/* Expanded row content */}
    <h3>Details for {item.name}</h3>
    {/* ... */}
  </div>
), []);
```

### 7. Use the TableWrapper Component

Replace your existing table rendering with the TableWrapper:

```tsx
return (
  <TableWrapper
    columns={columns}
    fetchData={fetchData}
    initialPageSize={50}
    renderExpanded={renderExpanded}
    noDataMessage="No items found"
    keyExtractor={(item) => item.id}
    onRowClick={handleRowClick}
    initialFilters={{
      searchTerm: '',
      // ... other initial filters
    }}
  />
);
```

### 8. Add the New Component to Your Routes

Update your routing to include the new component as an alternative view:

```tsx
// In your App.tsx or Routes file
<Route path="/your-entity" element={<YourEntityPage />} />
<Route path="/your-entity/enhanced" element={<EnhancedYourEntityPage />} />
```

### 9. Create a Toggle to Switch Between Views

Add a toggle in your UI to allow users to switch between views:

```tsx
function YourEntityPage() {
  const [useEnhancedView, setUseEnhancedView] = useState(false);
  
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Switch
          checked={useEnhancedView}
          onCheckedChange={setUseEnhancedView}
          label="Use enhanced table view"
        />
      </div>
      
      {useEnhancedView ? (
        <VirtualYourEntityTable />
      ) : (
        <OriginalYourEntityTable />
      )}
    </div>
  );
}
```

## Common Conversion Patterns

### Converting Filter Components

Replace direct filter state:

```tsx
// Before
const [filters, setFilters] = useState({ /* ... */ });

// After
const [tableFilters, setTableFilters] = useState({
  searchTerm: '',
  // other filters
});

// Update filters with debounce
useEffect(() => {
  const timer = setTimeout(() => {
    setTableFilters({
      searchTerm,
      // other filters
    });
  }, 300);
  
  return () => clearTimeout(timer);
}, [searchTerm, /* other filter dependencies */]);
```

### Converting Sorting

Replace custom sorting:

```tsx
// Before
const [sortBy, setSortBy] = useState('name');
const [sortDir, setSortDir] = useState('asc');

// After
// TanStack Table handles sorting internally with the columns config
```

### Converting Pagination

Replace custom pagination:

```tsx
// Before
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(50);

// After
// TableWrapper and useVirtualTableData handle pagination
```

## Testing the Conversion

After converting, test thoroughly:

1. **Filter functionality**: Ensure all filters work as expected
2. **Sorting**: Test column sorting in both directions
3. **Pagination**: Check that pagination works correctly
4. **Expandable rows**: Test expanding and collapsing rows
5. **Actions**: Verify all row actions function properly
6. **Performance**: Test with large datasets
7. **Mobile**: Ensure responsive behavior is maintained

## Example: Converting a Products Table

Before:
```tsx
function ProductsTable() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchProducts();
  }, []);
  
  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*');
    setProducts(data || []);
    setLoading(false);
  };
  
  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>${product.price}</td>
                <td>{product.stock}</td>
                <td>
                  <button onClick={() => handleEdit(product)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

After:
```tsx
function VirtualProductsTable() {
  const fetchProducts = useCallback(async ({ pageIndex, pageSize, filters }) => {
    try {
      const query = supabase
        .from('products')
        .select('*', { count: 'exact' });
        
      if (filters.searchTerm) {
        query = query.ilike('name', `%${filters.searchTerm}%`);
      }
      
      const start = pageIndex * pageSize;
      const end = start + pageSize - 1;
      const { data, count, error } = await query.range(start, end);
      
      if (error) throw error;
      
      return {
        data: data || [],
        totalCount: count || 0
      };
    } catch (err) {
      console.error('Error fetching products:', err);
      return { data: [], totalCount: 0 };
    }
  }, []);
  
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => `$${row.original.price.toFixed(2)}`,
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button onClick={() => handleEdit(row.original)}>Edit</Button>
      ),
    },
  ], [handleEdit]);
  
  return (
    <TableWrapper
      columns={columns}
      fetchData={fetchProducts}
      initialPageSize={50}
      noDataMessage="No products found"
      keyExtractor={(product) => product.id}
    />
  );
}
```

## Need Help?

If you encounter issues during conversion:

1. Refer to the `VirtualCustomersTable.tsx` as a reference implementation
2. Check the documentation in `/src/docs/virtual-table-system.md`
3. Ask for assistance from the team 