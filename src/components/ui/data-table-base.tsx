import { useState, useEffect, useRef, useCallback } from "react";
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
import { formatDate, formatDateTime } from "@/lib/utils";

type SortDirection = "asc" | "desc";

interface Column {
  header: string;
  accessor: string;
  sortable?: boolean;
  cell?: (value: any, row?: any) => React.ReactNode;
  type?:
    | "id"
    | "name"
    | "status"
    | "date"
    | "description"
    | "numeric"
    | "default";
  priority?: "high" | "medium" | "low";
  id?: string;
  width?: string;
}

interface DataTableBaseProps {
  columns: Column[];
  data: any[];
  defaultSortColumn?: string;
  defaultSortDirection?: SortDirection;
  searchTerm?: string;
  searchColumn?: string;
  onRowClick?: (row: any) => void;
  rowClassName?: string;
  containerClassName?: string;
  showSearch?: boolean;
  pageSize?: number;
  tableId?: string;
  isLoading?: boolean;
  highlightedRowId?: string;
  renderRow?: (row: any, index: number, defaultRow: React.ReactNode) => React.ReactNode;
  onSearchFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  showOfferMessage?: boolean;
}

export function DataTableBase({
  columns,
  data,
  defaultSortColumn = "fullname",
  defaultSortDirection = "asc",
  searchTerm = "",
  searchColumn = "",
  onRowClick,
  rowClassName = "",
  containerClassName = "",
  showSearch = false, // Default to false since search is now external
  pageSize = 50,
  tableId = "default-table",
  isLoading = false,
  highlightedRowId,
  renderRow,
  onSearchFocus,
  showOfferMessage = false,
}: DataTableBaseProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: defaultSortColumn,
    direction: defaultSortDirection,
  });
  // Search state is now passed as props
  const [filteredData, setFilteredData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [page, setPage] = useState(1);
  const [transformedData, setTransformedData] = useState([]);
  const loader = useRef(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Helper function to safely format dates
  const safeFormatDateTime = (dateStr: string | Date): string => {
    try {
      // Handle null or undefined
      if (!dateStr) {
        return "-";
      }
      
      // Handle already formatted dates to prevent double formatting
      if (typeof dateStr === 'string') {
        // Check if it's already in Greek format (DD/MM/YYYY HH:MM:SS [π.μ./μ.μ.])
        if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2} [πμ.]{4}$/.test(dateStr)) {
          return dateStr;
        }
        
        // Check if it's already in simple date format (DD/MM/YYYY)
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          return dateStr;
        }
      }
      
      return formatDateTime(dateStr);
    } catch (error) {
      console.error("Error formatting date:", error);
      return String(dateStr) || "-";
    }
  };

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: SortDirection = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Helper function to extract date parts for sorting
  const extractDateParts = (dateStr: string): { year: string, month: string, day: string, full: string } => {
    try {
      // Try to parse as ISO date first
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return {
          year: date.getFullYear().toString(),
          month: (date.getMonth() + 1).toString().padStart(2, '0'),
          day: date.getDate().toString().padStart(2, '0'),
          full: date.toISOString()
        };
      }
      
      // Try to parse Greek format DD/MM/YYYY
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return {
          day: parts[0],
          month: parts[1],
          year: parts[2].split(' ')[0], // Remove time part if exists
          full: `${parts[2]}-${parts[1]}-${parts[0]}` // ISO-like for comparison
        };
      }
      
      return { year: '0000', month: '00', day: '00', full: '' };
    } catch (error) {
      return { year: '0000', month: '00', day: '00', full: '' };
    }
  };

  // Filter and sort data when props change
  useEffect(() => {
    // Transform data for display
    const transformed = data.map(item => {
      // Create a copy of the item
      const newItem = { ...item };
      
      // Format date fields for display
      columns.forEach(column => {
        if (column.type === 'date' || inferColumnType(column.accessor) === 'date') {
          if (newItem[column.accessor]) {
            newItem[`_formatted_${column.accessor}`] = safeFormatDateTime(newItem[column.accessor]);
          }
        }
      });
      
      return newItem;
    });
    
    setTransformedData(transformed);
    
    // Apply search filter if searchTerm is provided
    let filtered = transformed;
    if (searchTerm && searchColumn) {
      filtered = transformed.filter(item => {
        const value = item[searchColumn];
        if (!value) return false;
        
        // For date columns, search in the formatted value
        if (columns.find(col => col.accessor === searchColumn && (col.type === 'date' || inferColumnType(searchColumn) === 'date'))) {
          const formattedValue = item[`_formatted_${searchColumn}`] || safeFormatDateTime(value);
          return formattedValue.toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    // Sort the filtered data
    const sorted = sortData(filtered, sortConfig.key, sortConfig.direction);
    setFilteredData(sorted);
    
    // Reset pagination
    setPage(1);
    setDisplayedData(sorted.slice(0, pageSize));
  }, [data, searchTerm, searchColumn, sortConfig, columns]);

  // Infer column type from accessor name
  const inferColumnType = (accessor: string) => {
    if (/date|created_at|updated_at|timestamp/i.test(accessor)) {
      return 'date';
    }
    return 'default';
  };

  // Get column width based on priority or type
  const getColumnWidth = (column: Column) => {
    // Use explicit width if provided
    if (column.width) return column.width;
    
    if (column.priority === 'high') return 'w-1/4';
    if (column.priority === 'medium') return 'w-1/6';
    if (column.priority === 'low') return 'w-1/12';
    
    // Default widths based on column type
    switch (column.type || inferColumnType(column.accessor)) {
      case 'id':
        return 'w-20';
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

  // Sort data based on column and direction
  const sortData = (data, sortColumn, sortDirection) => {
    return [...data].sort((a, b) => {
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
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  // Load more data when scrolling
  useEffect(() => {
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

    if (loader.current) {
      observer.observe(loader.current);
    }

    return () => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }
    };
  }, [displayedData, filteredData, page, pageSize]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    try {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      return date.toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateStr || "-";
    }
  };

  // Add a global style for search highlighting
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .search-highlight {
        background-color: #52796f !important;
        color: #cad2c5 !important;
        padding: 0 4px;
        border-radius: 2px;
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Modify the highlightMatch function
  const highlightMatch = (text: any, searchTerm: string, columnType: string): React.ReactNode => {
    if (!text || !searchTerm) return text || "-";
    
    const textStr = String(text);
    const searchTermLower = searchTerm.toLowerCase();
    
    // For date columns, we don't highlight matches
    if (columnType === 'date') {
      return textStr;
    }
    
    const index = textStr.toLowerCase().indexOf(searchTermLower);
    if (index === -1) return textStr;
    
    return (
      <>
        {textStr.substring(0, index)}
        <span className="search-highlight">
          {textStr.substring(index, index + searchTerm.length)}
        </span>
        {textStr.substring(index + searchTerm.length)}
      </>
    );
  };

  // Create a style object for each column to ensure consistent widths
  const columnStyles = columns.reduce((acc, column, index) => {
    const width = column.width || getColumnWidth(column);
    acc[column.accessor] = {
      width: width,
      minWidth: column.width ? undefined : '100px',
    };
    return acc;
  }, {});

  // Add a new function to handle search input focus
  const handleSearchFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text in the input when it receives focus
    e.target.select();
    // Call the external handler if provided
    if (onSearchFocus) {
      onSearchFocus(e);
    }
  };

  return (
    <div className="w-full flex flex-col" ref={tableRef}>
      {/* If you have a search input inside this component, add the onFocus handler */}
      {showSearch && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search..."
              className={cn(
                searchBarStyles.inputClasses,
                searchBarStyles.containerClasses
              )}
              value={searchTerm}
              onChange={(e) => {/* your existing search handler */}}
              onFocus={handleSearchFocus}
            />
          </div>
        </div>
      )}
      
      {/* Main table container with fixed header */}
      <div className="relative overflow-hidden border border-[#52796f] rounded-md">
        {/* Fixed header border that doesn't scroll */}
        <div className="absolute top-[39px] left-0 right-0 h-[1px] bg-[#52796f] z-20"></div>
        {/* Container with both horizontal and vertical scrollbars */}
        <div
          className="overflow-x-auto overflow-y-auto scrollbar-visible"
          style={{ maxHeight: "calc(70vh - 8rem)", height: "750px" }}
        >
          {/* Table with fixed layout */}
          <div className="min-w-full inline-block align-middle">
            <table className="min-w-full table-fixed border-collapse">
              {/* Fixed header */}
              <thead className="bg-[#2f3e46] sticky top-0 z-10">
                <tr className="hover:bg-transparent">
                  {columns.map((column) => (
                    <th
                      key={column.accessor || column.id || `column-${columns.indexOf(column)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        column.sortable !== false && handleSort(column.accessor);
                      }}
                      className={cn(
                        "text-[#84a98c] select-none whitespace-nowrap relative p-3 text-left font-normal text-sm",
                        column.sortable !== false
                          ? "cursor-pointer"
                          : "cursor-default",
                        sortConfig.key === column.accessor && "text-[#cad2c5] font-semibold"
                      )}
                      style={columnStyles[column.accessor]}
                    >
                      <div className="flex items-center">
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

              {/* Table body */}
              <tbody className="divide-y divide-[#52796f]/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]"></div>
                      </div>
                    </td>
                  </tr>
                ) : displayedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-8 text-[#84a98c]">
                      {searchTerm ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν υπάρχουν δεδομένα"}
                    </td>
                  </tr>
                ) : (
                  displayedData.map((row, index) => {
                    // Skip rendering if row is null or undefined
                    if (!row) return null;
                    
                    const defaultRow = (
                      <tr
                        key={row.id || index}
                        onClick={() => onRowClick && onRowClick(row)}
                        className={cn(
                          "transition-colors",
                          rowClassName,
                          highlightedRowId === row.id && "bg-[#52796f]/20",
                        )}
                      >
                        {columns.map((column) => (
                          <td
                            key={`${row.id || index}-${column.accessor || column.id || columns.indexOf(column)}`}
                            className={cn(
                              "text-[#cad2c5] whitespace-nowrap group-hover:underline py-1 px-3 text-sm",
                              column.type === "status" && "whitespace-nowrap",
                            )}
                            style={columnStyles[column.accessor]}
                          >
                            {column.cell
                              ? column.cell(row[column.accessor], row)
                              : (column.type === 'date' || inferColumnType(column.accessor) === 'date')
                                ? searchColumn === column.accessor && searchTerm
                                  ? highlightMatch(
                                      safeFormatDateTime(row[column.accessor]), 
                                      searchTerm, 
                                      'date'
                                    )
                                  : safeFormatDateTime(row[column.accessor])
                                : searchColumn === column.accessor && searchTerm
                                  ? highlightMatch(
                                      row[column.accessor], 
                                      searchTerm, 
                                      column.type || inferColumnType(column.accessor)
                                    )
                                  : row[column.accessor]}
                          </td>
                        ))}
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
                  })
                )}

                {/* Loader for infinite scrolling */}
                {isLoading && displayedData.length > 0 && (
                  <tr ref={loader}>
                    <td colSpan={columns.length} className="text-center py-4">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#84a98c]"></div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Total records count */}
      <div className="mt-3 mb-1 text-sm text-[#84a98c] px-2 flex justify-between items-center font-medium pt-2">
        <div className="text-left italic text-xs">
          {showOfferMessage && (
            <span>Παρακαλώ πατήστε δεξί κλικ για να προσθέσετε προσφορά</span>
          )}
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <span>Φόρτωση δεδομένων</span>
              <div className="flex items-center space-x-1">
                <div className="w-1 h-1 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <span>Δεν βρέθηκαν εγγραφές</span>
          ) : filteredData.length === 1 ? (
            <span>Βρέθηκε 1 εγγραφή</span>
          ) : displayedData.length < filteredData.length ? (
            <span>Εμφανίζονται <strong className="text-[#cad2c5]">{displayedData.length}</strong> από <strong className="text-[#cad2c5]">{filteredData.length}</strong> εγγραφές</span>
          ) : (
            <span>Βρέθηκαν <strong className="text-[#cad2c5]">{filteredData.length}</strong> εγγραφές</span>
          )}
          {!isLoading && searchTerm && (
            <span> για την αναζήτηση "<strong className="text-[#cad2c5]">{searchTerm}</strong>"</span>
          )}
        </div>
      </div>
    </div>
  );
}
