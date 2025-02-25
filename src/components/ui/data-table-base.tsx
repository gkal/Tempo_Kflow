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
  searchPlaceholder?: string;
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
  searchPlaceholder = "Αναζήτηση...",
  onRowClick,
  rowClassName = "",
  containerClassName = "",
  showSearch = true,
  pageSize = 20,
}: DataTableBaseProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: defaultSortColumn,
    direction: defaultSortDirection,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState(defaultSortColumn);
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

    if (searchTerm) {
      result = result.filter((item) => {
        const value = item[selectedColumn];
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
  }, [data, searchTerm, selectedColumn, sortConfig, pageSize]);

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
      {showSearch && (
        <div className="flex p-4 border-b border-[#52796f] mt-4">
          <div className="relative w-96 ml-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#84a98c]" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-8 pr-[200px] ${searchBarStyles.inputClasses}`}
            />
            <div className="absolute right-0 top-0 h-full">
              <DataSelect
                value={selectedColumn}
                onValueChange={setSelectedColumn}
              >
                <DataSelectTrigger className="h-full border-0 bg-transparent text-[#84a98c] rounded-l-none w-[190px] focus:ring-0 hover:bg-transparent">
                  <DataSelectValue
                    placeholder={
                      columns.find((c) => c.accessor === defaultSortColumn)
                        ?.header
                    }
                    className="text-right"
                  />
                </DataSelectTrigger>
                <DataSelectContent
                  className="bg-[#2f3e46] border-[#52796f]"
                  style={{
                    width: "max-content",
                    minWidth: `${Math.max(
                      ...columns.map((col) => col.header.length * 6 + 16),
                    )}px`,
                  }}
                  align="end"
                  sideOffset={5}
                >
                  {columns.map((column) => (
                    <DataSelectItem
                      key={column.accessor}
                      value={column.accessor}
                      className="text-[#84a98c] focus:bg-[#354f52] focus:text-[#cad2c5] flex items-center justify-between"
                    >
                      <span>{column.header}</span>
                    </DataSelectItem>
                  ))}
                </DataSelectContent>
              </DataSelect>
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-x-auto">
        <div className="max-h-[calc(70vh-8rem)] overflow-y-auto">
          <Table className="w-max">
            <TableHeader className="bg-[#2f3e46] border-b border-[#52796f] sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                {columns.map((column, index) => (
                  <TableHead
                    key={column.accessor}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: columnWidths[column.accessor],
                      minWidth: columnWidths[column.accessor],
                    }}
                    className={cn(
                      "text-[#84a98c] select-none whitespace-nowrap relative group",
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
                            const cellContent = cell.firstElementChild || cell;
                            const width =
                              cellContent.getBoundingClientRect().width;
                            maxContentWidth = Math.max(maxContentWidth, width);
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
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 text-[#84a98c]"
                  >
                    Δεν βρέθηκαν αποτελέσματα
                  </TableCell>
                </TableRow>
              ) : (
                displayedData.map((row, index) => (
                  <TableRow
                    key={index}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      rowClassName,
                      "group cursor-pointer transition-colors duration-150",
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.accessor}
                        style={{
                          width: columnWidths[column.accessor],
                          minWidth: columnWidths[column.accessor],
                        }}
                        className="text-[#cad2c5] whitespace-nowrap group-hover:underline"
                      >
                        {column.cell
                          ? column.cell(row[column.accessor], row)
                          : row[column.accessor]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {displayedData.length < filteredData.length && (
          <div
            ref={loader}
            className="w-full h-20 flex items-center justify-center text-[#84a98c]"
          >
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
}
