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
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

// Format date to ISO string for searching
const formatDateForSearch = (date: Date | null): string => {
  if (!date) return "";
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const DataTable = ({
  columns = defaultColumns,
  data = defaultData,
  onSort = () => {},
  onFilter = () => {},
  defaultSortColumn = "name",
  isLoading = false,
}: DataTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedColumn, setSelectedColumn] = useState(defaultSortColumn);
  const [isDateColumn, setIsDateColumn] = useState(false);
  const [forceShowDatePicker, setForceShowDatePicker] = useState(false);

  // Check if selected column is a date column
  useEffect(() => {
    const column = columns.find(col => col.accessor === selectedColumn);
    const isDate = column?.type === "date";
    console.log("Column changed:", selectedColumn, "Column type:", column?.type, "Is date column:", isDate);
    setIsDateColumn(isDate);
    
    // Reset search terms when switching columns
    setSearchTerm("");
    setSelectedDate(null);
  }, [selectedColumn, columns]);

  // Update search term based on selected date for date columns
  useEffect(() => {
    if (isDateColumn || forceShowDatePicker) {
      const formattedDate = formatDateForSearch(selectedDate);
      setSearchTerm(formattedDate);
      onFilter(formattedDate);
    }
  }, [selectedDate, isDateColumn, forceShowDatePicker, onFilter]);

  const handleSearch = (value: string) => {
    if (!isDateColumn && !forceShowDatePicker) {
      setSearchTerm(value);
      onFilter(value);
    }
  };

  const handleColumnChange = (column: string) => {
    setSelectedColumn(column);
    setForceShowDatePicker(false);
  };

  const handleDateChange = (date: Date | null) => {
    console.log("Date selected:", date);
    setSelectedDate(date);
  };

  const toggleDatePicker = () => {
    setForceShowDatePicker(!forceShowDatePicker);
  };

  console.log("Rendering search section, isDateColumn:", isDateColumn, "forceShowDatePicker:", forceShowDatePicker);
  
  // Determine if we should show the date picker
  const shouldShowDatePicker = isDateColumn || forceShowDatePicker;
  
  return (
    <div className="w-full bg-[#354f52] p-4 rounded-lg border border-[#52796f] overflow-hidden">
      {/* Debug Info */}
      <div className="mb-2 text-xs text-white bg-black/30 p-1 rounded">
        <div>Selected Column: {selectedColumn}</div>
        <div>Column Type: {columns.find(col => col.accessor === selectedColumn)?.type}</div>
        <div>Is Date Column: {isDateColumn ? "Yes" : "No"}</div>
        <div>Force Show DatePicker: {forceShowDatePicker ? "Yes" : "No"}</div>
        <div>Should Show DatePicker: {shouldShowDatePicker ? "Yes" : "No"}</div>
      </div>
      
      {/* Search and Filter Section */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center">
          {shouldShowDatePicker ? (
            <div className="flex items-center border border-[#52796f] rounded-lg overflow-hidden bg-[#2f3e46] p-2">
              <span className="text-[#cad2c5] mr-2">Select Date:</span>
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select a date"
                className="bg-transparent text-[#cad2c5] border-0 focus:outline-none"
                calendarClassName="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5]"
                isClearable
              />
            </div>
          ) : (
            <SearchBar
              onChange={handleSearch}
              value={searchTerm}
              options={columns.map(col => ({ value: col.accessor, label: col.header }))}
              selectedColumn={selectedColumn}
              onColumnChange={handleColumnChange}
            />
          )}
          
          <Button 
            variant="outline" 
            size="icon" 
            className="ml-2 border-[#52796f] text-[#84a98c] hover:bg-[#354f52]/50 hover:text-[#cad2c5]"
            onClick={toggleDatePicker}
            title={forceShowDatePicker ? "Switch to text search" : "Switch to date picker"}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
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
        </>
      )}
    </div>
  );
};

export default DataTable;
