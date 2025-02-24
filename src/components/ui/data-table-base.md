# DataTableBase Component

## Overview
A reusable table component with built-in sorting, filtering, and consistent styling for the entire project.

## Features
- Sortable columns with visual indicators
- Search functionality
- Customizable row and cell rendering
- Consistent styling with the project's theme
- TypeScript support with proper interfaces

## Usage

```tsx
import { DataTableBase } from "@/components/ui/data-table-base";

// Basic usage
const MyTable = () => (
  <DataTableBase
    columns={[
      { header: "Name", accessor: "name" },
      { header: "Email", accessor: "email" },
      {
        header: "Status",
        accessor: "status",
        cell: (value) => (
          <span className={`status-${value}`}>{value}</span>
        )
      }
    ]}
    data={myData}
    defaultSortColumn="name"
  />
);

// Full configuration
const AdvancedTable = () => (
  <DataTableBase
    columns={[
      {
        header: "Name",
        accessor: "name",
        sortable: true // default is true
      },
      {
        header: "Actions",
        accessor: "actions",
        sortable: false,
        cell: (_, row) => (
          <Button onClick={() => handleAction(row)}>Action</Button>
        )
      }
    ]}
    data={data}
    defaultSortColumn="name"
    defaultSortDirection="asc"
    searchPlaceholder="Search..."
    onRowClick={(row) => handleRowClick(row)}
    rowClassName="hover:bg-[#354f52]/50"
    containerClassName="bg-[#354f52] rounded-lg border border-[#52796f]"
    showSearch={true}
  />
);
```

## Props

```typescript
interface Column {
  header: string;           // Column header text
  accessor: string;         // Property key in data object
  sortable?: boolean;      // Enable/disable sorting (default: true)
  cell?: (value: any, row?: any) => React.ReactNode; // Custom cell renderer
}

interface DataTableBaseProps {
  columns: Column[];        // Table column definitions
  data: any[];             // Data array
  defaultSortColumn?: string;    // Initial sort column
  defaultSortDirection?: "asc" | "desc";  // Initial sort direction
  searchPlaceholder?: string;    // Search input placeholder
  onRowClick?: (row: any) => void;  // Row click handler
  rowClassName?: string;     // Additional row classes
  containerClassName?: string;  // Additional container classes
  showSearch?: boolean;     // Show/hide search input
}
```

## Styling Guidelines
- Use the project's color scheme:
  - Background: bg-[#354f52]
  - Border: border-[#52796f]
  - Text: text-[#cad2c5]
  - Muted text: text-[#84a98c]
- Row hover: hover:bg-[#354f52]/50
- Container: rounded-lg border border-[#52796f]

## Best Practices
1. Always provide meaningful column headers
2. Use custom cell renderers for complex data
3. Keep sortable:false for action columns
4. Implement onRowClick for interactive rows
5. Use consistent styling across tables

## Example Implementation
```tsx
// Example of a complete table implementation
const UsersTable = () => {
  return (
    <DataTableBase
      columns={[
        { header: "Username", accessor: "username" },
        { header: "Full Name", accessor: "fullname" },
        { header: "Email", accessor: "email" },
        { header: "Department", accessor: "department" },
        {
          header: "Status",
          accessor: "status",
          cell: (value) => (
            <span className={`status-${value}`}>{value}</span>
          )
        },
        {
          header: "",
          accessor: "actions",
          sortable: false,
          cell: (_, row) => (
            <div className="opacity-0 group-hover:opacity-100">
              <Button>Action</Button>
            </div>
          )
        }
      ]}
      data={users}
      defaultSortColumn="fullname"
      searchPlaceholder="Search users..."
      containerClassName="bg-[#354f52] rounded-lg border border-[#52796f]"
      rowClassName="hover:bg-[#354f52]/50"
    />
  );
};
```