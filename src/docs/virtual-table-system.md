# Virtual Table System Documentation

## Overview

This document explains the TanStack Table virtualization system implemented for high-performance data tables in the application. The system uses TanStack Table (formerly React Table) combined with TanStack Virtual (formerly React Virtual) to create tables that can efficiently handle large datasets with optimal performance.

## Key Components

### 1. VirtualTable Component
`/src/components/ui/virtual-table/VirtualTable.tsx`

The core component that renders a virtualized table using TanStack Table and TanStack Virtual. Features include:

- Row virtualization for handling large datasets
- Support for expandable rows
- Customizable column definitions
- Sorting capabilities
- Support for both virtualized and non-virtualized modes
- Infinite scrolling functionality
- Accessible keyboard navigation

### 2. TableWrapper Component
`/src/components/ui/virtual-table/TableWrapper.tsx`

A higher-level wrapper component that provides:

- Loading/error/empty states
- Pagination controls
- Data fetching integration
- Card-based UI with header and footer

### 3. useVirtualTableData Hook
`/src/hooks/useVirtualTableData.ts`

A custom hook that manages:

- Data fetching and pagination
- Loading states
- Error handling
- Filter application
- Server-side pagination support

### 4. Helper Components

- **TablePagination**: Handles page navigation and page size selection
- **DataFetchError**: Displays error messages with retry functionality
- **NoDataDisplay**: Shows a user-friendly empty state message

## Usage Examples

### Basic Usage

```tsx
import { TableWrapper } from "@/components/ui/virtual-table/TableWrapper";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Define columns
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
];

// Data fetching function
const fetchUsers = async ({ 
  pageIndex, 
  pageSize, 
  filters 
}) => {
  // Fetch data from API
  const response = await api.getUsers(pageIndex, pageSize, filters);
  
  return {
    data: response.data,
    totalCount: response.total
  };
};

// Component implementation
function UsersTable() {
  return (
    <TableWrapper
      title="Users"
      description="Manage system users"
      columns={columns}
      fetchData={fetchUsers}
      initialPageSize={50}
      noDataMessage="No users found"
      keyExtractor={(user) => user.id}
      onRowClick={(user) => handleUserClick(user)}
    />
  );
}
```

### With Expandable Rows

```tsx
function ExpandableTable() {
  // Function to render expanded content
  const renderExpanded = (row: User) => (
    <div className="p-4">
      <h3 className="font-bold">User Details</h3>
      <p>Email: {row.email}</p>
      <p>Role: {row.role}</p>
      {/* Additional details */}
    </div>
  );

  return (
    <TableWrapper
      title="Users with Details"
      columns={columns}
      fetchData={fetchUsers}
      renderExpanded={renderExpanded}
      // Other props...
    />
  );
}
```

## Performance Considerations

1. **Row Virtualization**: Only renders visible rows, keeping DOM size minimal regardless of dataset size
2. **Optimized Rerenders**: Uses memoization to prevent unnecessary rerenders
3. **Efficient Data Loading**: Implements server-side pagination and infinite scrolling
4. **Debounced Filters**: Prevents excessive API calls when filtering data
5. **Customizable Page Size**: Allows users to control how many rows are loaded at once

## Implementation Tips

### When to Use Virtualization

- Enable virtualization for tables that may contain more than 100 rows
- Consider disabling virtualization for smaller tables that require better accessibility

### Customizing Column Definitions

```tsx
const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor('name', {
    header: 'User Name',
    cell: info => <div className="font-bold">{info.getValue()}</div>,
  }),
  // More columns...
];
```

### Custom Cell Rendering

```tsx
{
  id: 'status',
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => (
    <Badge variant={row.original.status === 'active' ? 'success' : 'danger'}>
      {row.original.status}
    </Badge>
  ),
}
```

### Row Actions

```tsx
{
  id: 'actions',
  header: '',
  cell: ({ row }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleEdit(row.original)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(row.original)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
```

## Browser Support

The virtualization system works in all modern browsers:

- Chrome/Edge (latest versions)
- Firefox (latest versions) 
- Safari (latest versions)

## Accessibility

The table system implements several accessibility features:

- Keyboard navigation support
- ARIA attributes for screen readers
- Support for High Contrast Mode
- Non-virtualized mode for improved accessibility when needed

## Troubleshooting

### Table Not Rendering Correctly

- Ensure columns are properly defined with unique IDs
- Check that the data shape matches what columns expect
- Verify that container height is properly set

### Performance Issues

- Reduce the number of columns or complexity of cell renderers
- Increase the default page size
- Use more efficient cell rendering
- Simplify expandable row content

## Future Enhancements

- Multi-selection support
- Column resizing
- Column reordering
- Excel export functionality
- Advanced filtering UI 