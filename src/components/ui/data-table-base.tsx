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
        // This regex matches dates like "22/02/2025 05:23:45 μ.μ."
        const greekDateRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}( [πμ]\.[μ]\.)?$/;
        if (greekDateRegex.test(dateStr)) {
          return dateStr;
        }
        
        // Fix lowercase 't' in ISO format
        if (dateStr.includes('t')) {
          dateStr = dateStr.replace(/t/g, 'T');
        }
      }
      
      const date = new Date(dateStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "-";
      }
      
      // Format using the utility function
      const formatted = formatDateTime(date);
      return formatted;
    } catch (error) {
      return "-";
    }
  };

  // Transform the data when it's first received
  useEffect(() => {
    if (!data || data.length === 0) {
      setTransformedData([]);
      return;
    }
    
    // Create a deep copy of the data but don't transform date fields yet
    const transformed = data.map(item => {
      const newItem = { ...item };
      
      // Find date columns
      columns.forEach(column => {
        const columnType = column.type || inferColumnType(column.accessor);
        if (columnType === 'date') {
          // Just validate the date is parseable, but don't format it yet
          try {
            const date = new Date(newItem[column.accessor]);
            if (isNaN(date.getTime())) {
              // Invalid date - no action needed
            }
          } catch (error) {
            // Error parsing date - no action needed
          }
        }
      });
      
      return newItem;
    });
    
    setTransformedData(transformed);
  }, [data, columns]);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  // Function to extract date parts from ISO date string or formatted date string
  const extractDateParts = (dateStr: string): { year: string, month: string, day: string, full: string } => {
    try {
      // Check if it's already in Greek format (DD/MM/YYYY HH:MM:SS [π.μ./μ.μ.])
      const greekDateRegex = /^(\d{2})\/(\d{2})\/(\d{4}) \d{2}:\d{2}:\d{2}( [πμ]\.[μ]\.)?$/;
      const greekMatch = typeof dateStr === 'string' ? dateStr.match(greekDateRegex) : null;
      
      if (greekMatch) {
        // Extract parts from Greek format
        const day = greekMatch[1];
        const month = greekMatch[2];
        const year = greekMatch[3];
        const full = `${day}/${month}/${year}`;
        
        return { year, month, day, full };
      }
      
      // Handle ISO format
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return { year: "", month: "", day: "", full: dateStr };
      }
      
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const full = `${day}/${month}/${year}`;
      
      return { year, month, day, full };
    } catch (e) {
      return { year: "", month: "", day: "", full: dateStr };
    }
  };

  // Update filtered data - now using transformedData instead of data
  useEffect(() => {
    let result = [...transformedData];

    if (searchTerm && searchColumn) {
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Skip filtering if search term is empty after trimming
      if (searchLower === "") {
        // Don't filter - return all data
      } else {
        // Get column type for logging
        const columnType = columns.find(col => col.accessor === searchColumn)?.type || 
                          inferColumnType(searchColumn);
        
        const beforeCount = result.length;
        result = result.filter((item) => {
          const value = item[searchColumn];
          if (!value) return false;
          
          // Skip "-" values when searching
          if (value === "-") return false;
          
          const valueStr = value.toString().toLowerCase();
          
          // Get column type
          const columnType = columns.find(col => col.accessor === searchColumn)?.type || 
                            inferColumnType(searchColumn);
          
          // For date columns, remove the Greek time suffix (π.μ. or μ.μ.) for search purposes
          if (columnType === 'date') {
            // Format the date for display in logs
            const formattedForLog = safeFormatDateTime(value);
            const cleanedValue = valueStr.replace(/ [πμ]\.[μ]\.$/i, '');
            
            // Special handling for search terms with slashes or other date separators
            let isMatch = false;
            
            // Check if search term contains special characters like slashes
            if (searchLower.includes('/') || searchLower.includes('-') || searchLower.includes('.')) {
              // For search terms with separators, we need to be more exact
              // Extract date parts for more precise matching
              const dateParts = extractDateParts(value);
              
              // Try different date formats that might match the search pattern
              const possibleFormats = [
                `${dateParts.day}/${dateParts.month}/${dateParts.year}`, // DD/MM/YYYY
                `${dateParts.day}/${dateParts.month}`, // DD/MM
                `${dateParts.month}/${dateParts.year}`, // MM/YYYY
                `${dateParts.day}-${dateParts.month}-${dateParts.year}`, // DD-MM-YYYY
                `${dateParts.year}-${dateParts.month}-${dateParts.day}`, // YYYY-MM-DD
              ];
              
              // Check if any format starts with the search term
              isMatch = possibleFormats.some(format => 
                format.toLowerCase().startsWith(searchLower)
              );
            } else {
              // For simple search terms without separators, use the existing includes logic
              isMatch = cleanedValue.includes(searchLower);
            }
            
            return isMatch;
          }
          
          // For non-date columns, use the original logic
          return valueStr.includes(searchLower);
        });
      }
    }

    // Use the sortData function for consistent case-insensitive sorting
    result = sortData(result, sortConfig.key, sortConfig.direction);

    setFilteredData(result);
    setPage(1);
    setDisplayedData(result.slice(0, pageSize));
  }, [transformedData, searchTerm, searchColumn, sortConfig, pageSize, columns]);

  // Handle intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && displayedData.length < filteredData.length) {
        setPage((prev) => prev + 1);
      }
    },
    [displayedData.length, filteredData.length],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0,
    });

    if (loader.current) {
      observer.observe(loader.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  // Load more data when page changes
  useEffect(() => {
    const end = page * pageSize;
    setDisplayedData(filteredData.slice(0, end));
  }, [page, filteredData, pageSize]);

  // Helper function to infer column type from accessor if not explicitly provided
  const inferColumnType = (accessor: string) => {
    if (/id$/i.test(accessor)) return "id";
    if (/name|title/i.test(accessor)) return "name";
    if (/status|state/i.test(accessor)) return "status";
    if (/date|time|created|updated/i.test(accessor)) return "date";
    if (/description|notes|details/i.test(accessor)) return "description";
    if (/count|amount|total|price|quantity/i.test(accessor)) return "numeric";
    return "default";
  };

  // Get column width based on type
  const getColumnWidth = (column: Column) => {
    const type = column.type || inferColumnType(column.accessor);
    let baseWidth = "";

    switch (type) {
      case "id":
        baseWidth = "w-16";
        break;
      case "status":
        baseWidth = "w-32";
        break;
      case "date":
        baseWidth = "w-40";
        break;
      case "name":
        baseWidth = "w-1/4";
        break;
      case "numeric":
        baseWidth = "w-24";
        break;
      case "description":
        baseWidth = ""; // flexible width
        break;
      default:
        baseWidth = "w-auto";
    }

    // Add extra width for sortable columns to account for arrow space
    if (column.sortable !== false) {
      return `${baseWidth} min-w-[100px]`;
    }

    return baseWidth;
  };

  // Update the sorting function in the DataTableBase component
  const sortData = (data, sortColumn, sortDirection) => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      // Get the values to compare
      const valueA = a[sortColumn];
      const valueB = b[sortColumn];
      
      // Handle null or undefined values
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      
      // Get column type
      const columnType = columns.find(col => col.accessor === sortColumn)?.type || 
                         inferColumnType(sortColumn);
      
      // For date columns, use the original ISO date for sorting if available
      if (columnType === 'date') {
        // Try to use the original ISO date values stored during transformation
        const originalA = a[`_original_${sortColumn}`] || valueA;
        const originalB = b[`_original_${sortColumn}`] || valueB;
        
        // Parse dates for comparison
        const dateA = new Date(originalA);
        const dateB = new Date(originalB);
        
        // Check if dates are valid
        const isValidA = !isNaN(dateA.getTime());
        const isValidB = !isNaN(dateB.getTime());
        
        // Handle invalid dates
        if (!isValidA && isValidB) return 1;
        if (isValidA && !isValidB) return -1;
        if (!isValidA && !isValidB) {
          // Fall back to string comparison if both dates are invalid
          return sortDirection === 'asc' 
            ? String(valueA).localeCompare(String(valueB))
            : String(valueB).localeCompare(String(valueA));
        }
        
        // Compare valid dates
        return sortDirection === 'asc' 
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
      
      // Case-insensitive string comparison for string values
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.toLowerCase().localeCompare(valueB.toLowerCase())
          : valueB.toLowerCase().localeCompare(valueA.toLowerCase());
      }
      
      // For non-string values, use regular comparison
      return sortDirection === 'asc' 
        ? valueA > valueB ? 1 : -1
        : valueA < valueB ? 1 : -1;
    });
  };

  const sortedData = sortData(filteredData, sortConfig.key, sortConfig.direction);

  // Function to format and display dates nicely
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Function to highlight matched text
  const highlightMatch = (text: any, searchTerm: string, columnType: string): React.ReactNode => {
    if (!searchTerm || !text) return text;
    
    // Don't highlight if not searching or if the column isn't the one being searched
    if (!searchColumn) return text;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    // Skip highlighting if search term is empty after trimming
    if (searchLower === "") {
      return text;
    }
    
    // Skip highlighting for "-"
    if (text === "-") {
      return text;
    }
    
    // For all columns including dates - highlight anywhere since we've already formatted the dates
    const textStr = text.toString();
    const textLower = textStr.toLowerCase();
    
    // For date columns, we need to handle the Greek locale format
    if (columnType === 'date') {
      // Remove the Greek time suffix (π.μ. or μ.μ.) for search purposes
      const cleanedText = textLower.replace(/ [πμ]\.[μ]\.$/i, '');
      
      // Special handling for search terms with slashes or other date separators
      if (searchLower.includes('/') || searchLower.includes('-') || searchLower.includes('.')) {
        // For search terms with separators, try to find an exact match
        if (cleanedText.includes(searchLower)) {
          const index = cleanedText.indexOf(searchLower);
          
          return (
            <>
              {textStr.substring(0, index)}
              <span className="bg-[#52796f]/30 text-[#cad2c5] dark:bg-[#52796f]/50 dark:text-[#cad2c5]">
                {textStr.substring(index, index + searchTerm.length)}
              </span>
              {textStr.substring(index + searchTerm.length)}
            </>
          );
        }
        return text;
      }
      
      // For simple search terms without separators
      if (cleanedText.includes(searchLower)) {
        const index = cleanedText.indexOf(searchLower);
        // Adjust the index if we removed the suffix but the match is after where it would have been
        const adjustedIndex = index >= cleanedText.length - searchLower.length && 
                             cleanedText.length !== textLower.length ? 
                             textLower.indexOf(searchLower) : index;
        
        if (adjustedIndex === -1) {
          return text; // If we can't find it in the original, just return the text
        }
        
        return (
          <>
            {textStr.substring(0, adjustedIndex)}
            <span className="bg-[#52796f]/30 text-[#cad2c5] dark:bg-[#52796f]/50 dark:text-[#cad2c5]">
              {textStr.substring(adjustedIndex, adjustedIndex + searchTerm.length)}
            </span>
            {textStr.substring(adjustedIndex + searchTerm.length)}
          </>
        );
      }
      return text;
    }
    
    // For non-date columns, use the original logic
    if (textLower.includes(searchLower)) {
      const index = textLower.indexOf(searchLower);
      
      return (
        <>
          {textStr.substring(0, index)}
          <span className="bg-[#52796f]/30 text-[#cad2c5] dark:bg-[#52796f]/50 dark:text-[#cad2c5]">
            {textStr.substring(index, index + searchTerm.length)}
          </span>
          {textStr.substring(index + searchTerm.length)}
        </>
      );
    }
    
    return text;
  };

  return (
    <div className="w-full flex flex-col" ref={tableRef}>
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
                  <th className="text-[#84a98c] select-none whitespace-nowrap relative group w-10 text-center p-3 font-normal text-sm">
                    #
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.accessor || column.id || `column-${columns.indexOf(column)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        column.sortable !== false && handleSort(column.accessor);
                      }}
                      className={cn(
                        "text-[#84a98c] select-none whitespace-nowrap relative p-3 text-left font-normal text-sm",
                        getColumnWidth(column),
                        column.sortable !== false
                          ? "cursor-pointer"
                          : "cursor-default",
                        sortConfig.key === column.accessor && "text-[#cad2c5] font-semibold"
                      )}
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
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-8 text-[#84a98c] p-3"
                    >
                      <div className="flex justify-center items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </td>
                  </tr>
                ) : displayedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-8 text-[#84a98c] p-3"
                    >
                      {searchTerm ? "Δεν βρέθηκαν αποτελέσματα για την αναζήτησή σας" : "Δεν βρέθηκαν αποτελέσματα"}
                    </td>
                  </tr>
                ) : (
                  displayedData.map((row, index) => (
                    <tr
                      key={row.id || `row-${index}`}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        rowClassName,
                        row.id === highlightedRowId && "bg-[#52796f]/20 hover:bg-[#52796f]/30",
                        "group cursor-pointer transition-colors duration-150 h-8",
                      )}
                      data-role={row.role}
                      data-highlighted={row.id === highlightedRowId ? "true" : "false"}
                    >
                      <td className="text-[#cad2c5] whitespace-nowrap w-10 text-center py-1 px-3">
                        {index + 1}
                      </td>
                      {columns.map((column) => (
                        <td
                          key={`${row.id || index}-${column.accessor || column.id || columns.indexOf(column)}`}
                          className={cn(
                            "text-[#cad2c5] whitespace-nowrap group-hover:underline py-1 px-3 text-sm",
                            column.type === "status" && "whitespace-nowrap",
                          )}
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
                  ))
                )}

                {/* Loader for infinite scrolling */}
                {!isLoading && !searchTerm && filteredData.length > 0 && displayedData.length < filteredData.length && (
                  <tr key="infinite-scroll-loader">
                    <td colSpan={columns.length + 1}>
                      <div
                        ref={loader}
                        className="w-full h-20 flex items-center justify-center text-[#84a98c]"
                      >
                        Loading more...
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
      <div className="mt-3 mb-1 text-sm text-[#84a98c] px-2 text-center font-medium border-t border-[#52796f]/30 pt-2">
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
  );
}
