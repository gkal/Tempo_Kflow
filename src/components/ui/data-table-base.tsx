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
import { formatDate, formatDateTime } from "@/lib/utils";
import React from "react";

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
  showSearch = false, // Default to false since search is now external
  pageSize = 50,
  tableId = "default-table",
  isLoading = false,
  highlightedRowId,
  renderRow,
  onSearchFocus,
  showOfferMessage = false,
  footerHint,
  onRowClick,
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
        if (value === undefined || value === null) return false;
        
        const stringValue = String(value).toLowerCase();
        const searchTermLower = searchTerm.toLowerCase();
        
        // For date columns, search in the formatted value
        if (columns.find(col => col.accessor === searchColumn && (col.type === 'date' || inferColumnType(searchColumn) === 'date'))) {
          const formattedValue = item[`_formatted_${searchColumn}`] || safeFormatDateTime(value);
          return formattedValue.toLowerCase().includes(searchTermLower);
        }
        
        return stringValue.includes(searchTermLower);
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

  // Modify the highlightMatch function to add strong !important styles
  const highlightMatch = (text: any, searchTerm: string): React.ReactNode => {
    if (!text || !searchTerm || searchTerm.trim() === '') {
      return text || "-";
    }
    
    try {
      const textStr = String(text);
      const searchTermLower = searchTerm.trim().toLowerCase();
      const textLower = textStr.toLowerCase();
      
      // Find all matches
      const matches: { index: number; length: number }[] = [];
      let currentIndex = 0;
      
      // Collect all matches
      while ((currentIndex = textLower.indexOf(searchTermLower, currentIndex)) !== -1) {
        matches.push({ index: currentIndex, length: searchTermLower.length });
        currentIndex += searchTermLower.length;
      }
      
      if (matches.length === 0) {
        return textStr;
      }
      
      // Apply highlights to all matches at once
      let result = '';
      let lastIndex = 0;
      
      for (const match of matches) {
        // Text before match
        result += textStr.substring(lastIndex, match.index);
        
        // Highlighted match with very aggressive styling
        const highlightedText = textStr.substring(match.index, match.index + match.length);
        result += `<span style="background-color: #52796f !important; color: white !important; padding: 0 2px !important; border-radius: 2px !important; display: inline !important; position: relative !important; z-index: 999 !important;">${highlightedText}</span>`;
        
        lastIndex = match.index + match.length;
      }
      
      // Add any remaining text
      if (lastIndex < textStr.length) {
        result += textStr.substring(lastIndex);
      }
      
      // Return with unique key based on both content and search term
      return (
        <span 
          key={`highlight-${searchTerm}-${textStr.substring(0, 10)}-${Date.now()}`}
          dangerouslySetInnerHTML={{ __html: result }} 
        />
      );
    } catch (error) {
      console.error("Error in highlighting:", error);
      return text;
    }
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

  // Add a utility function for debouncing
  const useDebounce = (fn, delay) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const debouncedFn = useCallback((...args) => {
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

  // Add a new useEffect to handle direct DOM manipulation for highlighting
  useEffect(() => {
    // Create a more efficient highlight function
    const applyHighlights = () => {
      try {
        // Skip highlighting if search term is empty
        if (!searchTerm || !searchColumn || searchTerm.trim() === '') {
          // Only clear if we know there was a previous search
          const cells = document.querySelectorAll(`table tbody td[data-highlighted="true"]`);
          if (cells.length > 0) {
            cells.forEach(cell => {
              const cellDiv = cell.querySelector('div');
              if (cellDiv && cellDiv.innerHTML.includes('background-color')) {
                // Get the original text without highlighting
                const plainText = cellDiv.textContent || '';
                cellDiv.textContent = plainText;
                cell.removeAttribute('data-highlighted');
              }
            });
          }
          return;
        }
        
        // Optimize query - only target cells in the current column
        const selector = `table tbody td[data-column="${searchColumn}"]`;
        const cells = document.querySelectorAll(selector);
        const searchStr = searchTerm.toLowerCase().trim();
        
        cells.forEach(cell => {
          const cellDiv = cell.querySelector('div');
          if (!cellDiv) return;
          
          const cellText = cellDiv.textContent || '';
          if (!cellText) return;
          
          const textLower = cellText.toLowerCase();
          const hasMatch = textLower.includes(searchStr);
          
          if (hasMatch) {
            // Only re-highlight if needed
            if (cell.getAttribute('data-highlighted') !== 'true' || 
                cell.getAttribute('data-search-term') !== searchTerm) {
              
              // Find only the first match
              const firstMatchIndex = textLower.indexOf(searchStr);
              const matchEnd = firstMatchIndex + searchStr.length;
              
              // Apply highlighting to only the first match
              const before = cellText.substring(0, firstMatchIndex);
              const matchText = cellText.substring(firstMatchIndex, matchEnd);
              const after = cellText.substring(matchEnd);
              
              // Create result with only first match highlighted
              const result = `${before}<span style="background-color: #52796f !important; color: white !important; border-radius: 2px !important; display: inline !important; position: relative !important; z-index: 999 !important;">${matchText}</span>${after}`;
              
              // Update the cell content
              cellDiv.innerHTML = result;
              
              // Mark as highlighted with this term
              cell.setAttribute('data-highlighted', 'true');
              cell.setAttribute('data-search-term', searchTerm);
            }
          } else if (cell.getAttribute('data-highlighted') === 'true') {
            // Clear highlighting if this cell was previously highlighted
            cellDiv.textContent = cellText;
            cell.removeAttribute('data-highlighted');
            cell.removeAttribute('data-search-term');
          }
        });
      } catch (error) {
        console.error("Error in direct DOM highlighting:", error);
      }
    };
    
    // Run immediately without a delay
    applyHighlights();
    
    return () => {
      // Nothing to clean up
    };
  }, [searchTerm, searchColumn, displayedData]);

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
        {/* Container with both horizontal and vertical scrollbars */}
        <div
          className="overflow-x-auto overflow-y-auto scrollbar-visible"
          style={{ maxHeight: "calc(70vh - 8rem)", height: "750px" }}
        >
          {/* Table with fixed layout */}
          <div className="min-w-full inline-block align-middle">
            <table className="min-w-full table-fixed border-collapse">
              {/* Fixed header */}
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
                        column.sortable && "cursor-pointer hover:text-[#cad2c5]"
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

              {/* Table body */}
              <tbody className="divide-y divide-[#52796f]/30">
                {isLoading ? (
                  <tr key="loading-row">
                    <td colSpan={columns.length} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]"></div>
                      </div>
                    </td>
                  </tr>
                ) : displayedData.length === 0 ? (
                  <tr key="no-data-row">
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
                        // Force row to re-render when search term changes
                        key={`row-${row.id || index}-${searchTerm}-${Date.now()}`}
                        onClick={() => onRowClick && onRowClick(row)}
                        className={cn(
                          "transition-colors",
                          rowClassName,
                          highlightedRowId === row.id && "bg-[#52796f]/20",
                          onRowClick && "cursor-pointer"
                        )}
                      >
                        {columns.map((column, colIndex) => {
                          // Determine if this cell should be highlighted
                          const shouldHighlight = searchTerm && 
                                                 searchTerm.trim().length > 0 && 
                                                 searchColumn === column.accessor;
                          
                          const cellValue = row[column.accessor];
                          const columnType = column.type || inferColumnType(column.accessor);
                          
                          // Generate a more consistent key with searchTerm
                          const cellKey = `cell-${row.id || index}-${column.accessor}-${searchTerm}`;

                          return (
                            <td
                              key={cellKey}
                              data-column={column.accessor}
                              className={cn(
                                "text-[#cad2c5] group-hover:underline text-sm p-0",
                                column.type === "status" && "whitespace-nowrap",
                                // Add debug class if this cell should have highlighting
                                shouldHighlight && cellValue && String(cellValue).toLowerCase().includes(searchTerm.toLowerCase().trim()) && "has-highlight-debug"
                              )}
                              style={columnStyles[column.accessor]}
                            >
                              <div className="w-full h-full py-1 px-4">
                              {(() => {
                                // For date columns, just format the date without highlighting
                                if (columnType === 'date' || inferColumnType(column.accessor) === 'date') {
                                  const formattedDate = safeFormatDateTime(cellValue);
                                  return formattedDate;
                                }
                                
                                // If this cell has a custom renderer, use it
                                if (column.cell) {
                                  return column.cell(cellValue, row);
                                }
                                
                                // For non-date columns with a search term, apply highlighting if we have a value
                                if (shouldHighlight && cellValue && searchTerm && searchTerm.trim().length > 0 && 
                                    String(cellValue).toLowerCase().includes(searchTerm.toLowerCase().trim())) {
                                  return highlightMatch(cellValue, searchTerm);
                                } 
                                
                                // For all other cases, just return the cell value
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
                  })
                )}

                {/* Loader for infinite scrolling */}
                {isLoading && displayedData.length > 0 && (
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
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Total records count */}
      <div className="mt-3 mb-1 text-sm text-[#84a98c] px-2 flex justify-between items-center font-medium pt-2">
        <div className="text-left italic text-xs">
          {footerHint ? (
            <span>{footerHint}</span>
          ) : showOfferMessage ? (
            <span>Παρακαλώ πατήστε δεξί κλικ για να προσθέσετε προσφορά</span>
          ) : null}
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <svg className="animate-spin h-6 w-6 text-[#52796f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
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