import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps {
  columns?: Array<{
    header: string;
    accessor: string;
  }>;
  data?: Array<Record<string, any>>;
  onSort?: (column: string) => void;
  onFilter?: (searchTerm: string) => void;
}

const defaultColumns = [
  { header: "ID", accessor: "id" },
  { header: "Name", accessor: "name" },
  { header: "Status", accessor: "status" },
  { header: "Date", accessor: "date" },
];

const defaultData = [
  { id: 1, name: "Sample Item 1", status: "Active", date: "2024-03-20" },
  { id: 2, name: "Sample Item 2", status: "Pending", date: "2024-03-21" },
  { id: 3, name: "Sample Item 3", status: "Inactive", date: "2024-03-22" },
];

const DataTable = ({
  columns = defaultColumns,
  data = defaultData,
  onSort = () => {},
  onFilter = () => {},
}: DataTableProps) => {
  return (
    <div className="w-full bg-white p-4 rounded-lg shadow">
      {/* Search and Filter Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <Input
            placeholder="Search..."
            className="pl-10"
            onChange={(e) => onFilter(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Table Section */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.accessor}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onSort(column.accessor)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.accessor}>
                    {row[column.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          Showing 1 to {data.length} of {data.length} results
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
