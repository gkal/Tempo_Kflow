import React, { useState, useMemo, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  useReactTable,
  createColumnHelper,
  Row,
  RowData,
  VisibilityState
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, Filter, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// Define interfaces
interface ColumnMeta {
  className?: string;
  headerClassName?: string;
  [key: string]: any;
}

export interface Column<T> {
  id?: string;
  accessorKey?: string;
  header: string;
  cell?: (info: any) => React.ReactNode;
  enableSorting?: boolean;
  sortDescFirst?: boolean;
  meta?: ColumnMeta;
}

// CustomerTypeFilter component
interface CustomerTypeFilterProps {
  availableTypes: string[];
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

const CustomerTypeFilter: React.FC<CustomerTypeFilterProps> = ({ 
  availableTypes, 
  selectedTypes, 
  onChange 
}) => {
  const allSelected = selectedTypes.length === 0;
  const [isOpen, setIsOpen] = useState(false);
  
  const handleToggleType = (type: string) => {
    let newSelectedTypes: string[];
    
    if (selectedTypes.includes(type)) {
      // If already selected, remove it
      newSelectedTypes = selectedTypes.filter(t => t !== type);
    } else {
      // If not selected, add it
      newSelectedTypes = [...selectedTypes, type];
    }
    
    onChange(newSelectedTypes);
  };
  
  const handleSelectAll = () => {
    // If anything is selected, clear selection
    onChange([]);
  };

  // Determine if filter is active
  const isFilterActive = selectedTypes.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`h-9 px-4 flex items-center gap-2 w-[102px] justify-between ${
            isFilterActive 
              ? 'bg-[#52796f] text-white border-0 shadow-[0_0_35px_8px_rgba(82,121,111,0.95)] filter-glow-extreme scale-105' 
              : 'hover:bg-[#354f52] bg-[#2f3e46] border-0 text-[#cad2c5]'
          }`}
          title="Φίλτρο Τύπων"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Τύπος</span>
          </div>
          {isFilterActive ? 
            <div className="w-4 h-4 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-yellow-300"
              >
                <path d="M9 18h6"></path>
                <path d="M10 22h4"></path>
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
              </svg>
            </div>
            : 
            <div className="w-4 h-4"></div>
          }
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-0 bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] shadow-md overflow-hidden"
        align="center"
        sideOffset={8}
        style={{ boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div 
          className="bg-[#2f3e46] text-[#cad2c5]"
          style={{ padding: "0", margin: "0" }}
        >
          <button
            className="w-full text-left bg-[#2f3e46] text-[#cad2c5] hover:bg-[#354f52] transition-colors duration-150 px-3 py-2 flex items-center gap-2 cursor-pointer"
            onClick={handleSelectAll}
            style={{ border: "none", outline: "none" }}
          >
            {allSelected ? (
              <Check className="h-4 w-4 mr-2 text-[#84a98c]" />
            ) : (
              <div className="w-4 h-4 mr-2" />
            )}
            <span className="text-sm">Όλοι οι τύποι</span>
          </button>
          
          <div className="h-px bg-[#52796f]/30 mx-3 my-1" style={{ margin: "4px 12px" }}></div>
          
          {availableTypes.map((type) => (
            <button
              key={type}
              className="w-full text-left bg-[#2f3e46] text-[#cad2c5] hover:bg-[#354f52] transition-colors duration-150 px-3 py-2 flex items-center gap-2 cursor-pointer"
              onClick={() => handleToggleType(type)}
              style={{ border: "none", outline: "none" }}
            >
              {selectedTypes.includes(type) ? (
                <Check className="h-4 w-4 mr-2 text-[#84a98c]" />
              ) : (
                <div className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm">{type}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export interface VirtualDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  renderExpandedContent?: (row: T) => React.ReactNode;
  expandedRowIds?: Record<string, boolean>;
  onExpandRow?: (rowId: string) => void;
  containerClassName?: string;
  showSearchBar?: boolean;
  searchColumns?: { accessor: string; header: string }[];
  initialSearchColumn?: string;
  filterButtons?: {
    label: string;
    value: string;
    onClick: () => void;
    isActive: boolean;
  }[];
  emptyStateMessage?: string;
  loadingStateMessage?: string;
  customerTypes?: string[];
  selectedCustomerTypes?: string[];
  onCustomerTypeChange?: (types: string[]) => void;
}

export function VirtualDataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  onRowClick,
  getRowId = (row) => row.id?.toString() || "",
  renderExpandedContent,
  expandedRowIds = {},
  onExpandRow,
  containerClassName,
  showSearchBar = true,
  searchColumns = [],
  initialSearchColumn = "",
  filterButtons = [],
  emptyStateMessage = "No data found",
  loadingStateMessage = "Loading data...",
  customerTypes = [],
  selectedCustomerTypes = [],
  onCustomerTypeChange = () => {},
}: VirtualDataTableProps<T>) {
  // State
  const [sorting, setSorting] = useState<SortingState>(() => {
    // Don't set any default sorting
    return [];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState(initialSearchColumn || (searchColumns[0]?.accessor || ""));
  
  // Convert the columns to TanStack Table format
  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<T>();
    
    return columns.map((column) => {
      if (column.accessorKey) {
        return columnHelper.accessor(column.accessorKey as any, {
          id: column.id || column.accessorKey,
          header: () => column.header,
          cell: column.cell ? 
            ({ getValue, row }) => column.cell?.({ getValue: () => getValue(), row: row.original }) : 
            ({ getValue }) => getValue() || "-",
          enableSorting: column.enableSorting !== false,
          meta: column.meta
        });
      } else {
        return columnHelper.display({
          id: column.id || "",
          header: () => column.header,
          cell: column.cell ? 
            ({ row }) => column.cell?.({ row: row.original }) : 
            () => "",
          meta: column.meta
        });
      }
    });
  }, [columns]);
  
  // Filter the data based on the search term
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchColumn) return data;
    
    const searchLower = searchTerm.toLowerCase();
    return data.filter(item => {
      const value = item[searchColumn];
      return value ? String(value).toLowerCase().includes(searchLower) : false;
    });
  }, [data, searchTerm, searchColumn]);
  
  // Create the table instance
  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      // If it's a function, call it with current state
      const nextState = typeof updater === 'function' ? updater(sorting) : updater;
      
      // If trying to clear sorting (third click), revert to ascending
      if (!nextState || nextState.length === 0) {
        const currentColumn = sorting[0]?.id;
        setSorting([{ id: currentColumn || searchColumn, desc: false }]);
      } else {
        setSorting(nextState);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableMultiSort: false,
  });
  
  // Setup virtualization
  const { rows } = table.getRowModel();
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45, // Reduced from 50 to make scrolling smoother
    overscan: 5, // Reduced from 10 to improve performance
  });
  
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;
  
  // Handle row click
  const handleRowClick = useCallback((e: React.MouseEvent, row: T) => {
    if (onRowClick) {
      e.preventDefault();
      onRowClick(row);
    }
  }, [onRowClick]);
  
  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);
  
  // Handle search column change
  const handleColumnChange = useCallback((value: string) => {
    setSearchColumn(value);
    // Remove the automatic sorting when changing column
    // setSorting([{ id: value, desc: false }]);
  }, []);
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 bg-[#2f3e46] rounded-lg border border-[#52796f]">
        <LoadingSpinner fullScreen={false} />
        <span className="ml-3 text-[#cad2c5]">{loadingStateMessage}</span>
      </div>
    );
  }
  
  return (
    <>
      {/* Search and filter controls */}
      {(showSearchBar || filterButtons.length > 0 || customerTypes.length > 0) && (
        <div className="mb-4 flex flex-wrap items-end gap-4 justify-between">
          <div className="w-1/4">
            {/* Keep area empty as per original */}
          </div>
          
          <div className="flex-1 flex justify-center items-center gap-2">
            {showSearchBar && (
              <SearchBar 
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Αναζήτηση..."
                className="w-full max-w-sm"
                options={searchColumns.map(col => ({ value: col.accessor, label: col.header }))}
                selectedColumn={searchColumn}
                onColumnChange={handleColumnChange}
              />
            )}
            
            {customerTypes.length > 0 && (
              <CustomerTypeFilter
                availableTypes={customerTypes}
                selectedTypes={selectedCustomerTypes}
                onChange={onCustomerTypeChange}
              />
            )}
          </div>
          
          {filterButtons.length > 0 && (
            <div className="flex items-center gap-2 w-1/4 justify-end">
              {filterButtons.map((button) => (
                <div 
                  key={button.value}
                  onClick={button.onClick}
                  className="relative inline-block min-w-[70px]"
                >
                  <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                    ${button.value === 'all' && button.isActive 
                      ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(59,130,246,0.3)] ring-blue-400/50" 
                      : button.value === 'all'
                      ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"
                      : button.value === 'active' && button.isActive 
                      ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
                      : button.value === 'active'
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"
                      : button.value === 'inactive' && button.isActive 
                      ? "bg-red-500/20 text-red-400 font-medium shadow-[0_0_8px_2px_rgba(248,113,113,0.3)] ring-red-400/50" 
                      : "bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-transparent"
                    }`}
                  >
                    {button.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Table */}
      <div className="border border-[#52796f] bg-[#2f3e46]">
        <div className="overflow-auto" ref={parentRef} style={{ height: '65vh' }}>
          <table className="w-full border-collapse">
            <thead className="bg-[#2f3e46] sticky top-0 z-20 after:absolute after:content-[''] after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-[#52796f]">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, i) => {
                    // Safe access to meta with type assertion
                    const meta = header.column.columnDef.meta as { className?: string; headerClassName?: string } | undefined;
                    const className = meta?.className;
                    return (
                      <th 
                        key={header.id}
                        className={cn(
                          "px-3 py-3 text-left text-sm font-medium text-[#84a98c] hover:text-white whitespace-nowrap relative bg-[#2f3e46] h-[48px]",
                          i < headerGroup.headers.length - 1 && "after:content-[''] after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-px after:bg-[#52796f]/50",
                          header.column.getCanSort() ? "cursor-pointer select-none" : "",
                          className
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center h-full">
                          <span className="flex-1 text-center">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {header.column.getCanSort() && (
                            <span className="ml-2 w-4 flex-shrink-0">
                              {header.column.getIsSorted() && (
                                header.column.getIsSorted() === "asc" ? (
                                  <ChevronUp className="h-4 w-4 text-white" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-white" />
                                )
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#52796f]/20">
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={tableColumns.length} style={{ height: `${paddingTop}px` }} />
                </tr>
              )}
              
              {isLoading ? (
                <tr>
                  <td colSpan={tableColumns.length} className="text-center py-8">
                    <div className="flex justify-center items-center text-[#84a98c]">
                      <LoadingSpinner fullScreen={false} />
                      <span className="ml-3">{loadingStateMessage || 'Loading...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="text-center py-16">
                    <div className="flex flex-col justify-center items-center gap-2">
                      <span className="text-[#cad2c5] text-lg font-medium">{emptyStateMessage || 'Δεν βρέθηκαν αποτελέσματα'}</span>
                      <span className="text-[#84a98c] text-sm">Αλλάξτε τα κριτήρια αναζήτησης και δοκιμάστε ξανά.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                virtualRows.map(virtualRow => {
                  const row = rows[virtualRow.index];
                  const rowData = row.original as T;
                  const rowId = getRowId(rowData);
                  const isExpanded = !!expandedRowIds[rowId];
                  
                  return (
                    <React.Fragment key={rowId}>
                      {/* Main row */}
                      <tr
                        className={cn(
                          "hover:bg-[#354f52]/50 transition-colors duration-150",
                          onRowClick && "cursor-pointer",
                          isExpanded && "bg-[#354f52]/30"
                        )}
                        onClick={e => onRowClick && handleRowClick(e, rowData)}
                      >
                        {row.getVisibleCells().map(cell => {
                          // Safe access to meta with type assertion
                          const meta = cell.column.columnDef.meta as { className?: string; headerClassName?: string } | undefined;
                          const className = meta?.className;
                          
                          return (
                            <td
                              key={cell.id}
                              className={cn(
                                "px-3 py-3 text-[#cad2c5] text-sm",
                                className
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                      
                      {/* Expanded content */}
                      {isExpanded && renderExpandedContent && (
                        <tr className="bg-[#2f3e46]">
                          <td colSpan={tableColumns.length} className="px-3 py-2">
                            {renderExpandedContent(rowData)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
              
              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={tableColumns.length} style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Records count - outside the table */}
      <div className="flex justify-end mt-3">
        <p className="text-sm text-[#52796f]">
          Βρέθηκαν <span className="text-white font-medium">{isLoading ? "..." : filteredData.length}</span> εγγραφές
        </p>
      </div>
    </>
  );
} 