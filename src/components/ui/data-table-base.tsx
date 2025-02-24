import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchBar } from "@/components/ui/search-bar";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

interface Column {
  header: string;
  accessor: string;
  sortable?: boolean;
  cell?: (value: any) => React.ReactNode;
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
}: DataTableBaseProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  }>({
    key: defaultSortColumn,
    direction: defaultSortDirection,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState(data);

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

  // Update filtered and sorted data
  useEffect(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm) {
      result = result.filter((item) =>
        Object.values(item).some(
          (val) =>
            val &&
            val.toString().toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }

    // Apply sorting
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
  }, [data, searchTerm, sortConfig]);

  return (
    <div className={containerClassName}>
      {showSearch && (
        <div className="mb-4">
          <SearchBar
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={setSearchTerm}
            className="w-64"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.accessor}
                  className={cn(
                    "text-[#84a98c]",
                    column.sortable !== false && "select-none",
                  )}
                  onClick={() =>
                    column.sortable !== false && handleSort(column.accessor)
                  }
                >
                  <div className="flex items-center justify-between">
                    <span>{column.header}</span>
                    {column.sortable !== false &&
                      sortConfig.key === column.accessor && (
                        <span className="ml-2">
                          {sortConfig.direction === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, index) => (
              <TableRow
                key={index}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  onRowClick && "cursor-pointer",
                  rowClassName,
                  "group",
                )}
              >
                {columns.map((column) => (
                  <TableCell key={column.accessor} className="text-[#cad2c5]">
                    <span className="cursor-text hover:underline">
                      {column.cell
                        ? column.cell(row[column.accessor])
                        : row[column.accessor]}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
