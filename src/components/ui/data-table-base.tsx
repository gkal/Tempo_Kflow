import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DataSelect,
  DataSelectContent,
  DataSelectItem,
  DataSelectTrigger,
  DataSelectValue,
} from "@/components/ui/data-select";
import { Search, ChevronUp, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchBarStyles } from "@/lib/styles/search-bar";
import { formatDateTime, safeFormatDateTime, extractDateParts } from "@/utils/formatUtils";
import React from "react";
import { classNames } from "@/lib/styles/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Types
export type SortDirection = "asc" | "desc";
type ColumnType = "id" | "name" | "status" | "date" | "description" | "numeric" | "default";
type ColumnPriority = "high" | "medium" | "low";

export interface Column {
  header: string;
  accessor: string;
  sortable?: boolean;
  cell?: (value: any, row?: any) => React.ReactNode;
  type?: ColumnType;
  priority?: ColumnPriority;
  id?: string;
  width?: string;
}

export interface DataTableBaseProps {
  columns: Column[];
  data: any[];
  defaultSortColumn?: string;
  defaultSortDirection?: SortDirection;
  searchTerm?: string;
  searchColumn?: string;
  searchPlaceholder?: string;
  rowClassName?: string;
  containerClassName?: string;
  tableId?: string;
  isLoading?: boolean;
  expandAll?: boolean;
  pageSize?: number;
  showSearch?: boolean;
  showFilter?: boolean;
  filterOptions?: { value: string; label: string }[];
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
  infiniteScroll?: boolean;
  onRowClick?: (row: any) => void;
  onSearchChange?: (value: string) => void;
  onSearchFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  renderRow?: (row: any, index: number, defaultRow: JSX.Element) => React.ReactNode;
  highlightedRowId?: string | number;
  emptyStateMessage?: string;
  loadingStateMessage?: string;
  showOfferMessage?: boolean;
  footerHint?: string;
}

// Utility functions - could be moved to separate file

const inferColumnType = (accessor: string): ColumnType => {
  if (accessor.includes('date') || accessor.includes('created_at') || accessor.includes('updated_at')) {
    return 'date';
  }
  
  if (accessor.includes('amount') || accessor.includes('price') || accessor.includes('total')) {
    return 'numeric';
  }
  
  return 'default';
};

const getColumnWidth = (column: Column): string => {
  const type = column.type || inferColumnType(column.accessor);
  
  switch (type) {
    case 'id':
      return 'w-24';
    case 'name':
      return 'w-1/5';
    case 'status':
      return 'w-24';
    case 'date':
      return 'w-40';
    case 'description':
      return 'w-1/4';
    case 'numeric':
      return 'w-24';
    default:
      return '';
  }
};

// Highlight text with search term
const highlightMatch = (text: any, searchTerm: string): React.ReactNode => {
  if (!text || !searchTerm || searchTerm.trim() === '') {
    return text || "-";
  }
  
  try {
    const textStr = String(text);
    const searchTermLower = searchTerm.trim().toLowerCase();
    const textLower = textStr.toLowerCase();
    
    // Early return if no match
    if (!textLower.includes(searchTermLower)) {
      return textStr;
    }
    
    // Escape special regex characters in the search term
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create a regex that matches the search term case-insensitively
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    const parts = textStr.split(regex);
    
    return (
      <span key={`highlight-${searchTerm}-${textStr.substring(0, 10)}`}>
        {parts.map((part, index) => {
          const isMatch = part.toLowerCase() === searchTermLower;
          
          if (isMatch) {
            return (
              <span 
                key={index} 
                className="bg-[#52796f] text-white px-0.5 rounded-sm"
                aria-label={`Highlighted text: ${part}`}
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </span>
    );
  } catch (error) {
    console.error("Error in highlighting:", error);
    return text;
  }
};

// Main component
export function DataTableBase({
  columns,
  data,
  defaultSortColumn = "fullname",
  defaultSortDirection = "asc",
  searchTerm = "",
  searchColumn = "",
  searchPlaceholder = "",
  rowClassName = "",
  containerClassName = "",
  showSearch = false,
  pageSize = 50,
  tableId = "default-table",
  isLoading = false,
  highlightedRowId,
  renderRow,
  onSearchFocus,
  showOfferMessage = false,
  footerHint,
  onRowClick,
  emptyStateMessage = "No data found",
  loadingStateMessage = "Loading data...",
}: DataTableBaseProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: defaultSortColumn,
    direction: defaultSortDirection,
  });
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [displayedData, setDisplayedData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const loader = useRef<HTMLTableRowElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);

  // Sort data based on column and direction
  const sortData = useCallback((dataToSort: any[], sortColumn: string, sortDirection: SortDirection) => {
    return [...dataToSort].sort((a, b) => {
      // Get values to compare
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];
      
      // Handle undefined or null values
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';
      
      // Determine column type
      const columnDef = columns.find(col => col.accessor === sortColumn);
      const columnType = columnDef?.type || inferColumnType(sortColumn);
      
      // Special handling for date columns
      if (columnType === 'date') {
        const aDate = extractDateParts(String(aValue));
        const bDate = extractDateParts(String(bValue));
        
        // Compare by year, then month, then day
        if (aDate.year !== bDate.year) {
          return sortDirection === 'asc' 
            ? aDate.year.localeCompare(bDate.year) 
            : bDate.year.localeCompare(aDate.year);
        }
        
        if (aDate.month !== bDate.month) {
          return sortDirection === 'asc' 
            ? aDate.month.localeCompare(bDate.month) 
            : bDate.month.localeCompare(aDate.month);
        }
        
        return sortDirection === 'asc' 
          ? aDate.day.localeCompare(bDate.day) 
          : bDate.day.localeCompare(aDate.day);
      }
      
      // Convert to strings for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      // Compare values
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [columns]);

  // Handle sort click
  const handleSort = (key: string) => {
    let direction: SortDirection = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Add a utility function for debouncing
  const useDebounce = (fn: Function, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const debouncedFn = useCallback((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    }, [fn, delay]);
    
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);
    
    return debouncedFn;
  };

  // Focus handler with select-all behavior
  const handleSearchFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    if (onSearchFocus) {
      onSearchFocus(e);
    }
  };

  // Process and sort data whenever data or sort config changes
  useEffect(() => {
    if (!data || !Array.isArray(data)) {
      setFilteredData([]);
      return;
    }
    
    let processedData = [...data];
    
    // Apply search filter if search term exists
    if (searchTerm && searchTerm.trim() && searchColumn) {
      const searchTermLower = searchTerm.trim().toLowerCase();
      processedData = processedData.filter(row => {
        const value = row[searchColumn];
        if (!value) return false;
        return String(value).toLowerCase().includes(searchTermLower);
      });
    }
    
    // Sort the filtered data
    const sortedData = sortData(processedData, sortConfig.key, sortConfig.direction);
    setFilteredData(sortedData);
    
    // Reset pagination when data changes
    setPage(1);
    setDisplayedData(sortedData.slice(0, pageSize));
  }, [data, sortConfig, sortData, pageSize, searchTerm, searchColumn]);

  // Handle infinite scrolling
  useEffect(() => {
    if (!loader.current) return;
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && displayedData.length < filteredData.length) {
          const nextPage = page + 1;
          const nextData = filteredData.slice(0, nextPage * pageSize);
          setDisplayedData(nextData);
          setPage(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loader.current);
    
    return () => observer.disconnect();
  }, [displayedData, filteredData, page, pageSize]);

  // When data changes, consider it an attempted load
  useEffect(() => {
    if (!isLoading && !hasAttemptedLoad) {
      setHasAttemptedLoad(true);
    }
  }, [data, isLoading]);

  // Delay showing empty state to prevent flashing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (!isLoading && hasAttemptedLoad && data.length === 0) {
      // If we're not loading and have no data, show empty state after longer delay
      timer = setTimeout(() => {
        setShowEmptyState(true);
      }, 1000); // Increased to 1 second to ensure better UX
    } else {
      setShowEmptyState(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, hasAttemptedLoad, data.length]);

  // Create column styles map for consistent widths
  const columnStyles = columns.reduce<Record<string, React.CSSProperties>>((acc, column) => {
    const width = column.width || getColumnWidth(column);
    acc[column.accessor] = {
      width: width,
      minWidth: column.width ? undefined : '100px',
    };
    return acc;
  }, {});

  // JSX for loading state
  const renderLoading = () => (
    <tr key="loading-row">
      <td colSpan={columns.length} className="text-center py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]"></div>
        </div>
      </td>
    </tr>
  );

  // JSX for empty state
  const renderEmptyState = () => (
    <div className="p-4 text-center text-[#cad2c5]/70 text-sm">
      {isLoading ? loadingStateMessage : emptyStateMessage}
    </div>
  );

  // JSX for table header
  const renderTableHeader = () => (
    <thead className="bg-[#2f3e46] sticky top-0 z-20 shadow-sm after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-[#52796f] after:z-10">
      <tr className="hover:bg-transparent">
        {columns.map((column, index) => (
          <th
            key={`header-${column.accessor || column.id || index}`}
            onClick={(e) => {
              e.stopPropagation();
              column.sortable !== false && handleSort(column.accessor);
            }}
            className={cn(
              "text-[#84a98c] select-none relative p-0 text-left font-normal text-sm",
              column.sortable !== false && "cursor-pointer hover:text-[#cad2c5]"
            )}
            style={columnStyles[column.accessor]}
          >
            <div className="flex items-center py-1 px-3 w-full h-full">
              <span>{column.header}</span>
              {column.sortable !== false && (
                <span className="ml-1 inline-block w-3 text-center">
                  {sortConfig.key === column.accessor ? (
                    <span className="text-white" style={{ fontSize: '10px' }}>
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  ) : (
                    <span className="invisible" style={{ fontSize: '10px' }}>↓</span>
                  )}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );

  // JSX for rendering a table row
  const renderTableRow = (row: any, index: number) => {
    // Skip rendering if row is null or undefined
    if (!row) return null;
    
    const rowKey = `row-${row.id || index}`;
    
    const defaultRow = (
      <tr
        key={rowKey}
        onClick={() => onRowClick && onRowClick(row)}
        className={cn(
          "transition-colors",
          rowClassName,
          highlightedRowId === row.id && "bg-[#52796f]/20",
          onRowClick && "cursor-pointer"
        )}
      >
        {columns.map((column, colIndex) => {
          const shouldHighlight = searchTerm && 
                                 searchTerm.trim().length > 0 && 
                                 searchColumn === column.accessor;
          
          const cellValue = row[column.accessor];
          const columnType = column.type || inferColumnType(column.accessor);
          const cellKey = `cell-${row.id || index}-${column.accessor}`;

          return (
            <td
              key={cellKey}
              data-column={column.accessor}
              className={cn(
                "text-[#cad2c5] group-hover:underline text-sm p-0",
                columnType === "status" && "whitespace-nowrap"
              )}
              style={columnStyles[column.accessor]}
            >
              <div className="w-full h-full py-1 px-4">
              {(() => {
                // Date columns
                if (columnType === 'date') {
                  return safeFormatDateTime(cellValue);
                }
                
                // Custom cell renderer
                if (column.cell) {
                  return column.cell(cellValue, row);
                }
                
                // Apply highlighting if needed
                if (shouldHighlight && cellValue) {
                  return highlightMatch(cellValue, searchTerm);
                } 
                
                // Default case
                return cellValue || "-";
              })()}
              </div>
            </td>
          );
        })}
      </tr>
    );
    
    // Safely call renderRow if provided
    if (renderRow) {
      try {
        return renderRow(row, index, defaultRow);
      } catch (error) {
        console.error("Error in renderRow:", error);
        return defaultRow;
      }
    }
    
    return defaultRow;
  };

  // JSX for infinite scroll loader
  const renderScrollLoader = () => (
    <tr key="infinite-scroll-loader" ref={loader}>
      <td colSpan={columns.length} className="text-center py-4">
        <div className="flex items-center justify-center py-4">
          <svg className="animate-spin h-6 w-6 text-[#52796f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </td>
    </tr>
  );

  // JSX for footer content
  const renderFooter = () => {
    let contentRight = null;
    
    if (isLoading) {
      contentRight = (
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-6 w-6 text-[#52796f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    } else if (filteredData.length === 0) {
      contentRight = <span>Δεν βρέθηκαν εγγραφές</span>;
    } else if (filteredData.length === 1) {
      contentRight = <span>Βρέθηκε 1 εγγραφή</span>;
    } else if (displayedData.length < filteredData.length) {
      contentRight = (
        <span>
          Εμφανίζονται <strong className="text-[#cad2c5]">{displayedData.length}</strong> από <strong className="text-[#cad2c5]">{filteredData.length}</strong> εγγραφές
        </span>
      );
    } else {
      contentRight = (
        <span>
          Βρέθηκαν <strong className="text-[#cad2c5]">{filteredData.length}</strong> εγγραφές
          {searchTerm && (
            <span> για την αναζήτηση "<strong className="text-[#cad2c5]">{searchTerm}</strong>"</span>
          )}
        </span>
      );
    }
    
    return (
      <div className="text-sm text-[#84a98c] text-right mt-1">
        {contentRight}
      </div>
    );
  };

  // JSX for loading state in the table
  const renderTableLoading = () => (
    <div className="w-full h-[750px] flex items-center justify-center bg-[#2f3e46]">
      <div className="flex flex-col items-center justify-center">
        <LoadingSpinner 
          fullScreen={false} 
          delayBeforeSpinner={300} // Show spinner faster to reduce perception of slowness
        />
      </div>
    </div>
  );

  // JSX for empty state in the table
  const renderTableEmptyState = () => (
    <TableRow>
      <TableCell colSpan={columns.length} className="h-24 text-center">
        <div className="p-4 text-center text-[#cad2c5]/70 text-sm">
          {emptyStateMessage || "Δεν βρέθηκαν δεδομένα"}
          {searchTerm && (
            <div className="mt-1">
              Δοκιμάστε διαφορετικούς όρους αναζήτησης
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <div className={`relative overflow-hidden ${containerClassName}`}>
        {/* Search bar */}
        {showSearch && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder={searchPlaceholder || "Search..."}
                className={cn(
                  searchBarStyles.inputClasses,
                  searchBarStyles.containerClasses
                )}
                value={searchTerm}
                onChange={(e) => {/* Handled externally */}}
                onFocus={handleSearchFocus}
              />
            </div>
          </div>
        )}
        
        {/* Main table container */}
        {isLoading && !displayedData.length ? (
          renderTableLoading()
        ) : (
          <div className="relative overflow-hidden border border-[#52796f] rounded-md bg-[#2f3e46]">
            <div
              className="overflow-x-auto overflow-y-auto scrollbar-visible"
              style={{ maxHeight: "calc(70vh - 8rem)", height: "750px" }}
            >
              <div className="min-w-full inline-block align-middle">
                <table className="min-w-full table-fixed border-collapse">
                  {renderTableHeader()}

                  <tbody className="divide-y divide-[#52796f]/30">
                    {!isLoading && data.length === 0 && showEmptyState ? (
                      renderTableEmptyState()
                    ) : (
                      displayedData.map((row, index) => renderTableRow(row, index))
                    )}

                    {/* Loader for infinite scrolling */}
                    {isLoading && displayedData.length > 0 && renderScrollLoader()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer - completely outside the main container */}
      {renderFooter()}
    </>
  );
}