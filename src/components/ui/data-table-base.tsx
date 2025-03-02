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
import { Search } from "lucide-react";
import { ArrowUp } from "lucide-react";
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
      result = result.filter((item) => {
        const value = item[searchColumn];
        return (
          value &&
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredData(result);
    setPage(1);
    setDisplayedData(result.slice(0, pageSize));
  }, [data, searchTerm, searchColumn, sortConfig, pageSize]);

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

    switch (type) {
      case "id":
        return "w-16";
      case "status":
        return "w-32";
      case "date":
        return "w-40";
      case "name":
        return "w-1/4";
      case "numeric":
        return "w-24";
      case "description":
        return ""; // flexible width
      default:
        return "w-auto";
    }
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
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "text-[#84a98c] select-none whitespace-nowrap relative p-3 text-left font-normal text-sm",
                        getColumnWidth(column),
                        column.sortable !== false
                          ? "cursor-pointer"
                          : "cursor-default",
                      )}
                    >
                      <div className="flex items-center space-x-2 pr-4 overflow-hidden">
                        {column.sortable !== false && (
                          <ArrowUp
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              sortConfig.key !== column.accessor && "opacity-0",
                              sortConfig.direction === "desc" && "rotate-180",
                            )}
                          />
                        )}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            column.sortable !== false &&
                              handleSort(column.accessor);
                          }}
                          className={cn(
                            "truncate",
                            column.sortable !== false
                              ? "cursor-pointer hover:text-[#cad2c5]"
                              : "",
                          )}
                        >
                          {column.header}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table body */}
              <tbody>
                {sortedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-8 text-[#84a98c] p-3"
                    >
                      Δεν βρέθηκαν αποτελέσματα
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, index) => (
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
                            : row[column.accessor]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}

                {/* Loader for infinite scrolling */}
                {sortedData.length < filteredData.length && (
                  <tr>
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
