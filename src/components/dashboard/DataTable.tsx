import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import { DataTableBase } from "@/components/ui/data-table-base";

interface DataTableProps {
  columns?: Array<{
    header: string;
    accessor: string;
    type?: "id" | "name" | "status" | "date" | "description" | "numeric" | "default";
  }>;
  data?: Array<Record<string, any>>;
  onSort?: (column: string) => void;
  onFilter?: (searchTerm: string) => void;
  defaultSortColumn?: string;
  isLoading?: boolean;
}

const defaultColumns = [
  { header: "ID", accessor: "id", type: "id" as const },
  { header: "Name", accessor: "name", type: "name" as const },
  { header: "Status", accessor: "status", type: "status" as const },
  { header: "Date", accessor: "date", type: "date" as const },
];

const defaultData = [
  { id: 1, name: "Sample Item 1", status: "Active", date: "2024-03-20" },
  { id: 2, name: "Sample Item 2", status: "Pending", date: "2024-03-21" },
  { id: 3, name: "Sample Item 3", status: "Inactive", date: "2024-03-22" },
];

// Format date for searching
const formatDateForSearch = (dateString: string): string => {
  if (!dateString) return "";
  return dateString; // Just return the date string as is
};

const DataTable = ({
  columns = defaultColumns,
  data = defaultData,
  onSort = () => {},
  onFilter = () => {},
  defaultSortColumn = "name",
  isLoading = false,
}: DataTableProps) => {
  // Simple state for testing
  const [dateValue, setDateValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(true);

  // Simple handler for date changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    console.log("Date selected:", newDate);
    setDateValue(newDate);
    
    const formattedDate = formatDateForSearch(newDate);
    setSearchTerm(formattedDate);
    onFilter(formattedDate);
  };

  // Clear date
  const clearDate = () => {
    setDateValue("");
    setSearchTerm("");
    onFilter("");
  };

  // Toggle between date picker and search
  const toggleSearch = () => {
    setShowDatePicker(!showDatePicker);
    if (!showDatePicker) {
      setSearchTerm("");
      onFilter("");
    }
  };

  return (
    <div className="w-full bg-[#354f52] p-4 rounded-lg border border-[#52796f] overflow-hidden">
      {/* Simple toggle button */}
      <div className="mb-4 flex justify-center">
        <Button 
          variant="outline"
          className="border-[#52796f] text-[#84a98c] hover:bg-[#354f52]/50 hover:text-[#cad2c5]"
          onClick={toggleSearch}
        >
          {showDatePicker ? "Switch to Text Search" : "Switch to Date Picker"}
        </Button>
      </div>

      {/* Search and Filter Section */}
      <div className="flex items-center justify-center mb-4">
        {showDatePicker ? (
          <div className="flex items-center border border-[#52796f] rounded-lg overflow-hidden bg-[#2f3e46] p-2">
            <span className="text-[#cad2c5] mr-2">Select Date:</span>
            <input
              type="date"
              value={dateValue}
              onChange={handleDateChange}
              className="bg-transparent text-[#cad2c5] border-0 focus:outline-none"
            />
            {dateValue && (
              <button 
                onClick={clearDate}
                className="ml-2 text-[#cad2c5] hover:text-white"
              >
                ✕
              </button>
            )}
            <span className="ml-2 text-xs text-yellow-300">Date Input is here!</span>
          </div>
        ) : (
          <SearchBar
            onChange={(value) => {
              console.log("Search value:", value);
              setSearchTerm(value);
              onFilter(value);
            }}
            value={searchTerm}
            options={columns.map(col => ({ value: col.accessor, label: col.header }))}
            selectedColumn={defaultSortColumn}
            onColumnChange={() => {}}
          />
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
            <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      ) : (
        <>
          {/* Table Section */}
          <DataTableBase
            columns={columns}
            data={data}
            searchTerm={searchTerm}
            searchColumn={defaultSortColumn}
            defaultSortColumn={defaultSortColumn}
            rowClassName="hover:bg-[#354f52]/50 group"
            containerClassName="border border-[#52796f] rounded-md overflow-hidden"
            isLoading={isLoading}
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
        </>
      )}
    </div>
  );
};

export default DataTable;
