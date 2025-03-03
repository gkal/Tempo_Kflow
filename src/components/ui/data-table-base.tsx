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
  const loader = useRef(null);
  const tableRef = useRef<HTMLDivElement>(null);

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

  // Update filtered data
  useEffect(() => {
    let result = [...data];

    if (searchTerm && searchColumn) {
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Skip filtering if search term is empty after trimming
      if (searchLower === "") {
        // Don't filter - return all data
      } else {
        result = result.filter((item) => {
          const value = item[searchColumn];
          if (!value) return false;
          
          const valueStr = value.toString().toLowerCase();
          
          // Get column type
          const columnType = columns.find(col => col.accessor === searchColumn)?.type || 
                            inferColumnType(searchColumn);
          
          // Special handling for date columns
          if (columnType === "date") {
            // Debug: Log the date value and search term
            console.log(`Date value: "${valueStr}", Search term: "${searchLower}"`);
            
            // For date columns, just do a simple string include check
            return valueStr.includes(searchLower);
          }
          
          // Default case for non-date columns - match anywhere
          return valueStr.includes(searchLower);
        });
      }
    }

    // Use the sortData function for consistent case-insensitive sorting
    result = sortData(result, sortConfig.key, sortConfig.direction);

    setFilteredData(result);
    setPage(1);
    setDisplayedData(result.slice(0, pageSize));
  }, [data, searchTerm, searchColumn, sortConfig, pageSize, columns]);

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
    
    // For date columns, format the date first
    if (columnType === "date") {
      const formattedDate = formatDate(text.toString());
      const formattedLower = formattedDate.toLowerCase();
      
      // Check if the formatted date includes the search term
      if (formattedLower.includes(searchLower)) {
        const parts = formattedDate.split(new RegExp(`(${searchTerm})`, 'i'));
        
        if (parts.length > 1) {
          return (
            <>
              {parts.map((part, i) => 
                part.toLowerCase() === searchLower
                  ? <span key={i} className="bg-[#52796f] text-white px-0.5 rounded">{part}</span> 
                  : part
              )}
            </>
          );
        }
      }
      
      // If no match or no parts, just return the formatted date
      return formattedDate;
    }
    
    // For non-date columns - highlight anywhere
    const textStr = text.toString();
    const textLower = textStr.toLowerCase();
    
    if (textLower.includes(searchLower)) {
      const parts = textStr.split(new RegExp(`(${searchTerm})`, 'i'));
      
      return (
        <>
          {parts.map((part, i) => 
            part.toLowerCase() === searchLower
              ? <span key={i} className="bg-[#52796f] text-white px-0.5 rounded">{part}</span> 
              : part
          )}
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
                        "group cursor-pointer transition-colors duration-150 h-8",
                      )}
                      data-role={row.role}
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
    </div>
  );
}
