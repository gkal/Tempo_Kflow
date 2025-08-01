import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  VisibilityState,
  ColumnResizeMode,
  ColumnOrderState,
  ColumnSizingState
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, Filter, ChevronsUpDown, GripVertical, GripHorizontal, Grid, Grip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";
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
import { normalizePhone } from "@/services/duplicate-detection/normalizers";
import { VirtualTable } from "@/components/ui/virtual-table/VirtualTable";

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
  tableId?: string;
  stabilizeExpandedRows?: boolean;
  changedRowId?: string | null;
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
  tableId = 'default',
  stabilizeExpandedRows = true,
  changedRowId,
}: VirtualDataTableProps<T>) {
  // State for highlighting the previously selected row
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(() => {
    const selectedRowKey = `tableSelectedRow_${tableId}`;
    return sessionStorage.getItem(selectedRowKey);
  });
  
  // Clear highlighted row after a delay
  useEffect(() => {
    if (highlightedRowId) {
      const timer = setTimeout(() => {
        setHighlightedRowId(null);
        sessionStorage.removeItem(`tableSelectedRow_${tableId}`);
      }, 3000); // Highlight for 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [highlightedRowId, tableId]);
  
  // State
  const [sorting, setSorting] = useState<SortingState>(() => {
    // Try to get saved sorting from sessionStorage with unique key
    const storageKey = `tableSorting_${tableId}`;
    const savedSorting = sessionStorage.getItem(storageKey);
    
    if (savedSorting) {
      try {
        const parsedSorting = JSON.parse(savedSorting);
        // Validate that the sorting is valid
        if (Array.isArray(parsedSorting)) {
          return parsedSorting;
        }
      } catch (e) {
        console.error('Failed to parse saved sorting:', e);
      }
    }
    
    return [];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [searchColumn, setSearchColumn] = useState(initialSearchColumn || (searchColumns[0]?.accessor || ""));
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    // Try to get saved column order from localStorage with unique key
    const storageKey = `tableColumnOrder_${tableId}`;
    const savedOrder = localStorage.getItem(storageKey);
    
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        // Validate that all required columns exist in saved order
        const allColumnsExist = columns.every(column => {
          const columnId = column.id || column.accessorKey || "";
          return parsedOrder.includes(columnId);
        });
        
        // Ensure the order has the same columns as our current columns
        const hasSameLength = parsedOrder.length === columns.length;
        
        if (allColumnsExist && hasSameLength) {
          return parsedOrder;
        }
      } catch (e) {
        console.error('Failed to parse saved column order:', e);
      }
    }
    
    // If no saved order or invalid, use default order
    return columns.map(col => col.id || col.accessorKey || "");
  });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  
  // Initialize column sizes from localStorage or default values
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => {
    // Try to get saved sizes from localStorage with unique key
    const storageKey = `tableColumnSizes_${tableId}`;
    const savedSizes = localStorage.getItem(storageKey);
    if (savedSizes) {
      try {
        const parsedSizes = JSON.parse(savedSizes);
        // Validate that all required columns exist in saved sizes
        const allColumnsExist = columns.every(column => {
          const columnId = column.id || column.accessorKey || "";
          return columnId in parsedSizes;
        });
        if (allColumnsExist) {
          return parsedSizes;
        }
      } catch (e) {
        console.error('Failed to parse saved column sizes:', e);
      }
    }

    // If no saved sizes or invalid, use default sizes
    const initialSizes: Record<string, number> = {};
    columns.forEach(column => {
      const columnId = column.id || column.accessorKey || "";
      if (columnId) {
        initialSizes[columnId] = column.meta?.initialWidth || 150;
      }
    });
    return initialSizes;
  });

  // Save column sizes to localStorage whenever they change
  useEffect(() => {
    const storageKey = `tableColumnSizes_${tableId}`;
    localStorage.setItem(storageKey, JSON.stringify(columnSizing));
  }, [columnSizing, tableId]);
  
  // Save column order to localStorage whenever it changes
  useEffect(() => {
    const storageKey = `tableColumnOrder_${tableId}`;
    localStorage.setItem(storageKey, JSON.stringify(columnOrder));
  }, [columnOrder, tableId]);
  
  // Save sorting to sessionStorage whenever it changes
  useEffect(() => {
    const storageKey = `tableSorting_${tableId}`;
    sessionStorage.setItem(storageKey, JSON.stringify(sorting));
  }, [sorting, tableId]);
  
  // Convert the columns to TanStack Table format
  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<T>();
    
    return columns.map((column) => {
      const columnId = column.id || column.accessorKey || "";
      const width = columnSizing[columnId] || column.meta?.initialWidth || 150;
      
      if (column.accessorKey) {
        return columnHelper.accessor(column.accessorKey as any, {
          id: columnId,
          header: () => column.header,
          cell: column.cell ? 
            ({ getValue, row }) => (
              <div style={{ width: width - 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {column.cell?.({ getValue: () => getValue(), row: row.original }) as React.ReactNode}
              </div>
            ) : 
            ({ getValue }) => (
              <div style={{ width: width - 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(getValue() as string) || <span className="text-xs text-[#52796f]">-</span>}
              </div>
            ),
          enableSorting: column.enableSorting !== false,
          meta: column.meta,
          size: width,
        });
      } else {
        return columnHelper.display({
          id: columnId,
          header: () => column.header,
          cell: column.cell ? 
            ({ row }) => (
              <div style={{ width: width - 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {column.cell?.({ row: row.original }) as React.ReactNode}
              </div>
            ) : 
            () => (
              <div style={{ width: width - 24, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {""}
              </div>
            ),
          meta: column.meta,
          size: width,
        });
      }
    });
  }, [columns, columnSizing]);
  
  // Handle search with debounce
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    
    // Clear any existing timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    // Set a new timeout
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 300); // 300ms delay
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);
  
  // Filter the data based on the search term
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm || !searchColumn) return data;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    
    // Special case for phone search to use normalization
    if (searchColumn === 'telephone') {
      const normalizedSearchTerm = normalizePhone(searchLower);
      
      console.log('Phone search with normalized term:', normalizedSearchTerm);
      
      return data.filter(item => {
        const value = item[searchColumn];
        if (!value) return false;
        
        const normalizedValue = normalizePhone(String(value).toLowerCase());
        
        // Match the same approach as in the duplicate detection service
        
        // Special handling for format like 6983-50.50.43
        const hasDashDotFormat = searchLower.includes('-') && 
                              (searchLower.includes('.') || 
                               searchLower.endsWith('-') || 
                               searchLower.endsWith('-.'));
        
        // Build search conditions for different search strategies
        let matched = false;
        
        // Strategy 1: Full text search with original format
        if (String(value).toLowerCase().includes(searchLower)) {
          matched = true;
        }
        
        // Strategy 2: Substring search on normalized digits sequence
        if (normalizedValue.includes(normalizedSearchTerm)) {
          matched = true;
        }
        
        // Strategy 3: Special format pattern matching
        if (hasDashDotFormat) {
          // Extract the digit groups from format like 6983-50.50.43
          const firstPart = searchLower.split('-')[0];
          if (firstPart && firstPart.length >= 4) {
            const phoneValue = String(value).toLowerCase();
            if (phoneValue.startsWith(firstPart + '-')) {
              matched = true;
            }
          }
        }
        
        // Strategy 4: For short phone numbers (5-6 digits), use broader matching with prefix
        const digitsOnly = searchLower.replace(/\D/g, '');
        if (digitsOnly.length >= 5 && digitsOnly.length <= 6) {
          // Use the prefix for broader matching - this prevents records from disappearing as more digits are typed
          const phonePrefix = digitsOnly.substring(0, Math.min(5, digitsOnly.length));
          if (normalizedValue.includes(phonePrefix)) {
            matched = true;
          }
        }
        
        return matched;
      });
    }
    
    // Default search for other columns
    return data.filter(item => {
      const value = item[searchColumn];
      return value ? String(value).toLowerCase().includes(searchLower) : false;
    });
  }, [data, debouncedSearchTerm, searchColumn]);
  
  // Create the table instance
  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: {
      sorting,
      columnOrder,
      columnSizing,
    },
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableMultiSort: false,
    enableColumnResizing: false,
    defaultColumn: {
      size: 150
    },
  });
  
  // Setup virtualization
  const { rows } = table.getRowModel();
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  // Check if any rows are expanded
  const hasExpandedRows = Object.values(expandedRowIds || {}).some(Boolean);
  
  // We'll use virtualization with special handling for expanded rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index) => {
      if (stabilizeExpandedRows && hasExpandedRows) {
        const rowData = rows[index]?.original as T;
        if (!rowData) return 45;
        
        const rowId = getRowId(rowData);
        const isExpanded = expandedRowIds?.[rowId] || false;
        
        // Use a consistent large value for expanded rows
        return isExpanded ? 2000 : 45; // Very large to accommodate any number of offers
      }
      return 45;
    }, [rows, expandedRowIds, getRowId, hasExpandedRows, stabilizeExpandedRows]),
    overscan: hasExpandedRows ? 50 : 10, // Increase overscan when rows are expanded
    // Use smooth scrolling with proper type signature
    scrollToFn: useCallback((offset, canSmooth, instance) => {
      const scrollElement = instance.scrollElement;
      if (scrollElement) {
        scrollElement.scrollTo({
          top: offset,
          behavior: canSmooth ? 'smooth' : 'auto'
        });
      }
    }, []),
    rangeExtractor: useCallback((range) => {
      // Find expanded row index if any
      const expandedRowIndex = hasExpandedRows 
        ? rows.findIndex(row => {
            const rowId = getRowId(row.original as T);
            return expandedRowIds?.[rowId];
          })
        : -1;
        
      // Standard range calculation from @tanstack/react-virtual
      const { startIndex, endIndex, overscan } = range;
      const newRange = [];
      
      // Add extra buffer before for smooth scrolling
      const start = Math.max(0, startIndex - overscan);
      
      // Add extra buffer at the end with more overlap to prevent jumping
      // Use a larger overscan value at the end for stability
      const endOverscan = Math.min(rows.length * 0.25, 100); // Up to 25% of rows or 100 max
      const end = Math.min(rows.length - 1, endIndex + endOverscan);
      
      // Add expanded row index to the range if it's not already included
      if (expandedRowIndex !== -1 && (expandedRowIndex < start || expandedRowIndex > end)) {
        // Always keep the expanded row in the range
        newRange.push(expandedRowIndex);
      }
      
      // Add all other rows in the visible range
      for (let i = start; i <= end; i++) {
        newRange.push(i);
      }
      
      return newRange;
    }, [rows, expandedRowIds, getRowId, hasExpandedRows])
  });
  
  // Get virtualization values
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;
  
  // Restore scroll position on mount
  useEffect(() => {
    if (isLoading) return;
    
    const scrollKey = `tableScrollPosition_${tableId}`;
    const selectedRowKey = `tableSelectedRow_${tableId}`;
    const savedScrollPosition = sessionStorage.getItem(scrollKey);
    const savedSelectedRowId = sessionStorage.getItem(selectedRowKey);
    
    const restorePosition = () => {
      // First try to restore by scroll position
      if (savedScrollPosition && parentRef.current) {
        const scrollPosition = parseInt(savedScrollPosition, 10);
        parentRef.current.scrollTop = scrollPosition;
      }
      // If we have a selected row, try to scroll to it
      else if (savedSelectedRowId && rows.length > 0) {
        const rowIndex = rows.findIndex(row => getRowId(row.original as T) === savedSelectedRowId);
        if (rowIndex !== -1 && rowVirtualizer) {
          // Scroll to the row with some offset to center it
          rowVirtualizer.scrollToIndex(rowIndex, { align: 'center' });
        }
      }
    };
    
    // Try multiple times to ensure content is rendered
    const timeouts = [100, 300, 500, 1000];
    timeouts.forEach(delay => {
      setTimeout(restorePosition, delay);
    });
    
    // Clear the timeouts on cleanup
    return () => {
      timeouts.forEach((_, index) => clearTimeout(index));
    };
  }, [tableId, isLoading, rowVirtualizer, rows, getRowId]);
  
  // Save scroll position before unmount or navigation
  useEffect(() => {
    const saveScrollPosition = () => {
      if (parentRef.current) {
        const storageKey = `tableScrollPosition_${tableId}`;
        sessionStorage.setItem(storageKey, parentRef.current.scrollTop.toString());
      }
    };
    
    // Save on component unmount
    return () => {
      saveScrollPosition();
    };
  }, [tableId]);
  
  // Also save scroll position on navigation (when clicking a row)
  const saveScrollPositionRef = useCallback(() => {
    if (parentRef.current) {
      const storageKey = `tableScrollPosition_${tableId}`;
      sessionStorage.setItem(storageKey, parentRef.current.scrollTop.toString());
    }
  }, [tableId]);
  
  // Store initial column sizes
  const initialColumnSizesRef = React.useRef(columnSizing);
  
  // Handle row click
  const handleRowClick = useCallback((e: React.MouseEvent, row: T) => {
    // Check if there's an open context menu
    const isContextMenu = (e.target as HTMLElement).closest('.dropdown-menu');
    if (isContextMenu) {
      // If this row was clicked while a context menu was open, don't proceed with the row click
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    if (onRowClick) {
      e.preventDefault();
      // Save scroll position and clicked row ID before navigating
      saveScrollPositionRef();
      const rowId = getRowId(row);
      sessionStorage.setItem(`tableSelectedRow_${tableId}`, rowId);
      onRowClick(row);
    }
  }, [onRowClick, saveScrollPositionRef, getRowId, tableId]);
  
  // Handle search column change
  const handleColumnChange = useCallback((value: string) => {
    setSearchColumn(value);
    // Remove the automatic sorting when changing column
    // setSorting([{ id: value, desc: false }]);
  }, []);
  
  const handleResizeStart = (columnId: string, event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    // Get the specific header element being resized
    const headerElement = (event.target as HTMLElement).closest('th');
    if (!headerElement) return;
    
    // Initial measurements
    const startX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const startWidth = headerElement.getBoundingClientRect().width;
    
    // Create a resize overlay to prevent other elements from interfering
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.zIndex = '1000';
    overlay.style.cursor = 'col-resize';
    document.body.appendChild(overlay);
    
    // Create visual resize guide
    const resizeGuide = document.createElement('div');
    resizeGuide.style.position = 'absolute';
    resizeGuide.style.top = '0';
    resizeGuide.style.bottom = '0';
    resizeGuide.style.width = '2px';
    resizeGuide.style.backgroundColor = 'rgba(132, 169, 140, 0.4)'; // #84a98c with 40% opacity
    resizeGuide.style.zIndex = '1001';
    const tableElement = headerElement.closest('table');
    const tableRect = tableElement?.getBoundingClientRect();
    const headerRect = headerElement.getBoundingClientRect();
    if (tableRect) {
      resizeGuide.style.left = `${headerRect.right - tableRect.left}px`;
      resizeGuide.style.height = `${tableRect.height}px`;
      tableElement?.parentElement?.appendChild(resizeGuide);
    }
    
    // Find column index based on header's position among its siblings
    const headerCells = Array.from(headerElement.parentElement?.children || []);
    const columnIndex = headerCells.indexOf(headerElement);
    
    // Track current width
    let currentWidth = startWidth;
    
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const diff = currentX - startX;
      
      // Calculate new width with a minimum of 40px to keep column visible
      const newWidth = Math.max(40, startWidth + diff);
      currentWidth = newWidth;
      
      // Update guide position
      if (resizeGuide && tableRect) {
        resizeGuide.style.left = `${headerRect.left - tableRect.left + newWidth}px`;
      }
      
      // Apply width to all cells in this column immediately
      if (tableElement) {
        // Apply width to all th and td that are index'th child of their parent
        const columnSelector = `th:nth-child(${columnIndex + 1}), td:nth-child(${columnIndex + 1})`;
        const columnCells = tableElement.querySelectorAll(columnSelector);
        
        columnCells.forEach(cell => {
          (cell as HTMLElement).style.width = `${newWidth}px`;
          (cell as HTMLElement).style.minWidth = `${newWidth}px`;
          
          // Update content container
          const content = cell.firstElementChild;
          if (content) {
            const padding = cell.tagName === 'TH' ? 40 : 24;
            (content as HTMLElement).style.width = `${newWidth - padding}px`;
            (content as HTMLElement).style.overflow = 'hidden';
            (content as HTMLElement).style.textOverflow = 'ellipsis';
            (content as HTMLElement).style.whiteSpace = 'nowrap';
          }
        });
      }
    };

    const handleMouseUp = () => {
      // Remove all event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
      
      // Remove the overlay and guide
      document.body.removeChild(overlay);
      resizeGuide.remove();
      
      // Update the state with the final width
      const finalSizing = {...columnSizing};
      finalSizing[columnId] = currentWidth;
      setColumnSizing(finalSizing);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
  };

  // Function to calculate the maximum content width for a column
  const calculateMaxContentWidth = (columnId: string) => {
    const column = table.getColumn(columnId);
    if (!column) return 150;

    let maxWidth = 0;
    
    // Get header width
    const headerElement = document.querySelector(`[data-column-id="${columnId}"]`);
    if (headerElement) {
      const headerContent = headerElement.querySelector('.header-content');
      if (headerContent) {
        maxWidth = Math.max(maxWidth, headerContent.getBoundingClientRect().width);
      }
    }

    // Get content width from all visible rows
    const rows = table.getRowModel().rows;
    rows.forEach(row => {
      const cell = row.getVisibleCells().find(cell => cell.column.id === columnId);
      if (cell) {
        const cellElement = document.querySelector(`[data-cell-id="${cell.id}"]`);
        if (cellElement) {
          const content = cellElement.firstElementChild;
          if (content) {
            // Get the actual content width without padding
            const contentWidth = content.getBoundingClientRect().width;
            maxWidth = Math.max(maxWidth, contentWidth);
          }
        }
      }
    });

    // Add padding and some buffer
    return Math.max(100, maxWidth + 48); // 24px padding on each side
  };

  // Function to handle double click for auto-resize
  const handleDoubleClick = (columnId: string) => {
    const maxWidth = calculateMaxContentWidth(columnId);
    const currentWidth = columnSizing[columnId] || 150;
    
    // Only update if the new width is different
    if (maxWidth !== currentWidth) {
      setColumnSizing(prev => ({
        ...prev,
        [columnId]: maxWidth
      }));
    }
  };
  
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setIsDragging(true);
    setDraggedColumnId(columnId);
    e.dataTransfer.setData('text/plain', columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (columnId !== draggedColumnId) {
      setDropTargetId(columnId);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const sourceColumnId = e.dataTransfer.getData('text/plain');
    
    if (sourceColumnId !== targetColumnId) {
      // Get current column order
      const oldOrder = [...table.getState().columnOrder];
      
      // Build a completely new array with the reordered columns
      const newOrder = [];
      
      // Add all columns in their original order until we hit the target
      for (let i = 0; i < oldOrder.length; i++) {
        const currentId = oldOrder[i];
        
        // If this is where we want to insert the dragged column
        if (currentId === targetColumnId) {
          // Add the dragged column first
          newOrder.push(sourceColumnId);
        }
        
        // Skip the dragged column in its original position
        if (currentId !== sourceColumnId) {
          newOrder.push(currentId);
        }
      }
      
      console.log('Reordering columns:', {
        sourceId: sourceColumnId,
        targetId: targetColumnId,
        sourceIndex: oldOrder.indexOf(sourceColumnId),
        targetIndex: oldOrder.indexOf(targetColumnId),
        oldOrder,
        newOrder
      });
      
      // Update the column order state
      setColumnOrder(newOrder);
      
      // Force update the table with the new order
      setTimeout(() => {
        table.setColumnOrder(newOrder);
      }, 0);
    }
    
    setIsDragging(false);
    setDraggedColumnId(null);
    setDropTargetId(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedColumnId(null);
    setDropTargetId(null);
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 bg-[#2f3e46] rounded-lg border border-[#52796f]">
        <Loader fullScreen={false} />
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
                onChange={(value) => {
                  setSearchTerm(value);
                  
                  // Clear any existing timeout
                  if (searchDebounceRef.current) {
                    clearTimeout(searchDebounceRef.current);
                  }
                  
                  // Set a new timeout
                  searchDebounceRef.current = setTimeout(() => {
                    setDebouncedSearchTerm(value);
                  }, 300); // 300ms delay
                }}
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
      <div className={cn(
        "w-full rounded-md mt-4 border border-[#52796f] bg-[#2f3e46] text-black overflow-x-auto",
        containerClassName
      )}>
        <div 
          className="overflow-x-auto overflow-y-auto relative" 
          ref={parentRef} 
          style={{ 
            height: '60vh', 
            scrollbarWidth: 'thin',
            scrollbarColor: '#52796f #2f3e46',
            overscrollBehavior: 'none', // Prevent scroll chaining
            contain: 'strict' // Optimize rendering
          }}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-[#354f52]/30 pointer-events-none z-10" />
          )}
          <div className="inline-block min-w-max">
            <table className="border-collapse [&_th]:border-0 [&_td]:border-0" style={{ tableLayout: 'fixed', width: 'max-content' }}>
              <thead className="bg-[#2f3e46] sticky top-0 z-20 after:absolute after:content-[''] after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-[#52796f]">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="[&_th]:border-0">
                    {headerGroup.headers.map((header, i) => {
                      const meta = header.column.columnDef.meta as { className?: string; headerClassName?: string } | undefined;
                      const className = meta?.className;
                      const isDraggedColumn = isDragging && draggedColumnId === header.column.id;
                      const isLastHeader = i === headerGroup.headers.length - 1;
                      
                      return (
                        <th
                          key={header.id}
                          data-column-id={header.column.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, header.column.id)}
                          onDragOver={(e) => handleDragOver(e, header.column.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, header.column.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "p-2 text-center text-sm font-medium text-[#84a98c] hover:text-white whitespace-nowrap relative bg-[#2f3e46] h-[48px] border-0 transition-all duration-150",
                            i < headerGroup.headers.length - 1 ? "after:content-[''] after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-px after:bg-[#52796f]/50" : "",
                            isLastHeader && "border-r-[2px] border-r-[#52796f]",
                            header.column.getCanSort() ? "cursor-pointer select-none" : "cursor-grab active:cursor-grabbing",
                            isDraggedColumn && "bg-[#84a98c]/20 backdrop-blur-sm shadow-lg z-30",
                            dropTargetId === header.column.id && "before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[#84a98c] before:z-40",
                            className
                          )}
                          style={{
                            width: `${columnSizing[header.column.id] || header.getSize()}px`,
                            minWidth: `${columnSizing[header.column.id] || header.getSize()}px`,
                            boxSizing: 'border-box',
                            overflow: 'hidden'
                          }}
                        >
                          <div className="flex items-center h-full">
                            <div
                              className={cn(
                                "cursor-grab active:cursor-grabbing",
                                isDraggedColumn && "cursor-grabbing"
                              )}
                              style={{ width: 0, height: 0, overflow: 'hidden' }}
                            >
                              <Grip className={cn(
                                "h-3 w-3",
                                isDraggedColumn ? "text-[#84a98c]" : "text-[#52796f] hover:text-[#84a98c]"
                              )} />
                            </div>
                            
                            {/* Header text and sort icon */}
                            <div 
                              className="flex-1 flex items-center justify-center"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (header.column.getCanSort()) {
                                  header.column.getToggleSortingHandler()(e);
                                }
                              }}
                            >
                              <div className="inline-flex items-center">
                                <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                {header.column.getCanSort() && (
                                  <ChevronUp className={cn(
                                    "h-4 w-4 ml-3",
                                    header.column.getIsSorted() 
                                      ? "text-white" 
                                      : "text-[#52796f] opacity-60",
                                    header.column.getIsSorted() === "desc" && "rotate-180"
                                  )} />
                                )}
                              </div>
                            </div>
                            
                            {/* Resize handle */}
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleResizeStart(header.column.id, e);
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleResizeStart(header.column.id, e);
                              }}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDoubleClick(header.column.id);
                              }}
                              className={cn(
                                "absolute right-0 top-0 h-full w-4 cursor-col-resize select-none touch-none",
                                "hover:before:content-[''] hover:before:absolute hover:before:h-full hover:before:w-[3px] hover:before:bg-[#84a98c] hover:before:right-0 hover:before:top-0",
                                "active:before:content-[''] active:before:absolute active:before:h-full active:before:w-[3px] active:before:bg-[#84a98c] active:before:right-0 active:before:top-0",
                                header.column.getIsResizing() ? "before:content-[''] before:absolute before:h-full before:w-[3px] before:bg-[#3b82f6] before:right-0 before:top-0 before:shadow-[0_0_8px_rgba(59,130,246,0.5)]" : ""
                              )}
                              style={{ cursor: 'col-resize' }}
                            />
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
                    <td colSpan={tableColumns.length} style={{ height: `${paddingTop}px`, padding: 0 }} />
                  </tr>
                )}
                
                {isLoading ? (
                  <tr>
                    <td colSpan={tableColumns.length} className="text-center py-8">
                      <div className="flex justify-center items-center text-[#84a98c]">
                        <Loader fullScreen={false} />
                        <span className="ml-3">{loadingStateMessage || 'Loading...'}</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr style={{ height: 'calc(60vh - 100px)' }}>
                    <td 
                      colSpan={tableColumns.length} 
                      className="text-center"
                    >
                      <div className="absolute inset-0 flex items-center justify-center w-full h-full">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="text-[#cad2c5] text-lg font-medium">{emptyStateMessage || 'Δεν βρέθηκαν αποτελέσματα'}</span>
                          <span className="text-[#84a98c] text-sm">Αλλάξτε τα κριτήρια αναζήτησης και δοκιμάστε ξανά.</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Virtualized rows
                  virtualRows.map(virtualRow => {
                    const row = rows[virtualRow.index];
                    const rowData = row.original as T;
                    const rowId = getRowId(rowData);
                    const isExpanded = !!expandedRowIds[rowId];
                    const isChanged = changedRowId === rowId;
                    const isHighlighted = highlightedRowId === rowId;
                    
                    return (
                      <React.Fragment key={rowId}>
                        {/* Main row */}
                        <tr
                          className={cn(
                            "hover:bg-[#354f52]/50 relative border border-transparent",
                            !isChanged && "row-glow-transition",
                            onRowClick && "cursor-pointer",
                            isExpanded && "bg-[#354f52]/30 sticky top-0 z-10",
                            isChanged && "row-changed",
                            isHighlighted && "bg-[#52796f]/30 transition-colors duration-500"
                          )}
                          onClick={e => onRowClick && handleRowClick(e, rowData)}
                          data-customer-id={rowId}
                        >
                          {row.getVisibleCells().map((cell, cellIndex) => {
                            // Safe access to meta with type assertion
                            const meta = cell.column.columnDef.meta as { className?: string; headerClassName?: string } | undefined;
                            const className = meta?.className;
                            const isLastColumn = cellIndex === row.getVisibleCells().length - 1;
                            
                            return (
                              <td
                                key={cell.id}
                                data-cell-id={cell.id}
                                className={cn(
                                  "px-2 py-2 text-[#cad2c5] text-sm",
                                  !isLastColumn && "border-r border-[#52796f]",
                                  className
                                )}
                                style={{
                                  width: `${columnSizing[cell.column.id] || cell.column.getSize()}px`,
                                  overflow: 'hidden',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
                        </tr>
                        
                        {/* Expanded content */}
                        {isExpanded && renderExpandedContent && (
                          <tr className="bg-[#2f3e46]" data-customer-id={rowId}>
                            <td colSpan={tableColumns.length} className="px-0 py-0">
                              <div className="relative">
                                {renderExpandedContent(rowData)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                
                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={tableColumns.length} style={{ height: `${paddingBottom}px`, padding: 0 }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
