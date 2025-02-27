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
  width?: number;
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
  pageSize = 20,
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
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(
    {},
  );
  const loader = useRef(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Initialize column widths
  useEffect(() => {
    const defaultWidths = {};
    columns.forEach((column) => {
      defaultWidths[column.accessor] = column.width || 200;
    });
    setColumnWidths(defaultWidths);
  }, [columns]);

  // Handle column resize
  const handleColumnResize = (accessor: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [accessor]: width,
    }));
  };

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

  return (
    <div className="w-full flex flex-col" ref={tableRef}>
      {/* Main table container with fixed header */}
      <div className="relative overflow-hidden border border-[#52796f] rounded-md">
        {/* Container with both horizontal and vertical scrollbars */}
        <div className="overflow-x-scroll overflow-y-scroll scrollbar-visible max-h-[calc(70vh-8rem)]">
          {/* Table with fixed layout */}
          <div className="min-w-full inline-block align-middle">
            <table className="min-w-full table-fixed border-collapse">
              {/* Fixed header */}
              <thead className="bg-[#2f3e46] border-b border-[#52796f] sticky top-0 z-10">
                <tr className="hover:bg-transparent">
                  <th className="text-[#84a98c] select-none whitespace-nowrap relative group w-10 text-center p-3 font-normal text-sm">
                    #
                  </th>
                  {columns.map((column, index) => (
                    <th
                      key={column.accessor}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: columnWidths[column.accessor],
                        minWidth: columnWidths[column.accessor],
                      }}
                      className={cn(
                        "text-[#84a98c] select-none whitespace-nowrap relative group p-3 text-left font-normal text-sm",
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
                      {index < columns.length - 1 && (
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-[#52796f]/20 hover:bg-[#52796f] opacity-0 group-hover:opacity-100 transition-colors"
                          onDoubleClick={() => {
                            const headerCell = document.querySelector(
                              `th:nth-child(${index + 1}) span`,
                            );
                            const headerWidth =
                              headerCell?.getBoundingClientRect().width || 0;

                            const cells = document.querySelectorAll(
                              `td:nth-child(${index + 1})`,
                            );
                            let maxContentWidth = 0;

                            cells.forEach((cell) => {
                              const cellContent =
                                cell.firstElementChild || cell;
                              const width =
                                cellContent.getBoundingClientRect().width;
                              maxContentWidth = Math.max(
                                maxContentWidth,
                                width,
                              );
                            });

                            const finalWidth =
                              maxContentWidth > headerWidth
                                ? maxContentWidth + 16
                                : headerWidth + 16;
                            handleColumnResize(column.accessor, finalWidth);
                          }}
                          onMouseDown={(e) => {
                            const startX = e.pageX;
                            const startWidth = columnWidths[column.accessor];

                            const handleMouseMove = (e: MouseEvent) => {
                              const diff = e.pageX - startX;
                              handleColumnResize(
                                column.accessor,
                                Math.max(50, startWidth + diff),
                              );
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener(
                                "mousemove",
                                handleMouseMove,
                              );
                              document.removeEventListener(
                                "mouseup",
                                handleMouseUp,
                              );
                            };

                            document.addEventListener(
                              "mousemove",
                              handleMouseMove,
                            );
                            document.addEventListener("mouseup", handleMouseUp);
                          }}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table body */}
              <tbody>
                {displayedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-8 text-[#84a98c] p-3"
                    >
                      Δεν βρέθηκαν αποτελέσματα
                    </td>
                  </tr>
                ) : (
                  displayedData.map((row, index) => (
                    <tr
                      key={index}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        rowClassName,
                        "group cursor-pointer transition-colors duration-150 h-12",
                      )}
                      data-role={row.role}
                    >
                      <td className="text-[#cad2c5] whitespace-nowrap w-10 text-center p-3">
                        {index + 1}
                      </td>
                      {columns.map((column) => (
                        <td
                          key={column.accessor}
                          style={{
                            width: columnWidths[column.accessor],
                            minWidth: columnWidths[column.accessor],
                          }}
                          className="text-[#cad2c5] whitespace-nowrap group-hover:underline p-3"
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
                {displayedData.length < filteredData.length && (
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
