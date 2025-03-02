import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import { DataTableBase } from "@/components/ui/data-table-base";

interface DataTableProps {
  columns?: Array<{
    header: string;
    accessor: string;
  }>;
  data?: Array<Record<string, any>>;
  onSort?: (column: string) => void;
  onFilter?: (searchTerm: string) => void;
  defaultSortColumn?: string;
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
  defaultSortColumn = "name",
}: DataTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState(defaultSortColumn);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onFilter(value);
  };

  const handleColumnChange = (column: string) => {
    setSelectedColumn(column);
  };

  return (
    <div className="w-full bg-[#354f52] p-4 rounded-lg border border-[#52796f] overflow-hidden">
      {/* Search and Filter Section */}
      <div className="flex items-center justify-center mb-4">
        <SearchBar
          onChange={handleSearch}
          value={searchTerm}
          options={columns.map(col => ({ value: col.accessor, label: col.header }))}
          selectedColumn={selectedColumn}
          onColumnChange={handleColumnChange}
        />
      </div>

      {/* Table Section */}
      <DataTableBase
        columns={columns}
        data={data}
        searchTerm={searchTerm}
        searchColumn={selectedColumn}
        defaultSortColumn={defaultSortColumn}
        rowClassName="hover:bg-[#354f52]/50 group"
        containerClassName="border border-[#52796f] rounded-md overflow-hidden"
      />

      {/* Pagination Section */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-[#84a98c]">
          Showing 1 to {data.length} of {data.length} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="border-[#52796f] text-[#84a98c] hover:bg-[#354f52]/50 hover:text-[#cad2c5]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-[#52796f] text-[#84a98c] hover:bg-[#354f52]/50 hover:text-[#cad2c5]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
