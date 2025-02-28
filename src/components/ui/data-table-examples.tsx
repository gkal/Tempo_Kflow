import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Example 1: Auto-sizing columns based on content
export const AutoSizingColumnsExample = () => {
  const [isCompact, setIsCompact] = useState(true);

  return (
    <div className="border border-[#52796f] rounded-md overflow-hidden">
      <div className="bg-[#2f3e46] p-2 flex justify-between items-center">
        <h3 className="text-[#cad2c5] font-medium">
          Auto-sizing Columns Example
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCompact(!isCompact)}
          className="border-[#52796f] text-[#84a98c] hover:bg-[#354f52]/50 hover:text-[#cad2c5]"
        >
          {isCompact ? "Expanded View" : "Compact View"}
        </Button>
      </div>

      <div className="overflow-x-auto scrollbar-visible">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#2f3e46] border-b border-[#52796f] sticky top-0 z-10">
            <tr>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                #
              </th>
              <th
                className={`text-[#84a98c] font-normal text-sm p-3 text-left ${isCompact ? "w-32" : "w-64"}`}
              >
                Name
              </th>
              <th
                className={`text-[#84a98c] font-normal text-sm p-3 text-left ${isCompact ? "w-24" : "w-40"}`}
              >
                Status
              </th>
              <th
                className={`text-[#84a98c] font-normal text-sm p-3 text-left ${isCompact ? "w-24" : "w-40"}`}
              >
                Date
              </th>
              <th
                className={`text-[#84a98c] font-normal text-sm p-3 text-left ${isCompact ? "w-40" : "w-96"}`}
              >
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-[#354f52]/50 transition-colors">
                <td className="text-[#cad2c5] p-3">{i}</td>
                <td className="text-[#cad2c5] p-3">Sample Item {i}</td>
                <td className="text-[#cad2c5] p-3">
                  {i === 1 ? "Active" : i === 2 ? "Pending" : "Inactive"}
                </td>
                <td className="text-[#cad2c5] p-3">2024-03-2{i}</td>
                <td className="text-[#cad2c5] p-3">
                  {isCompact
                    ? `This is a sample description for item ${i}...`
                    : `This is a sample description for item ${i}. It contains more text to demonstrate how the expanded view shows more content without truncation.`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Example 2: Fixed column width categories
export const FixedWidthCategoriesExample = () => {
  const [columnWidths, setColumnWidths] = useState({
    name: "medium",
    status: "narrow",
    date: "narrow",
    description: "wide",
  });

  const widthMap = {
    narrow: "w-24",
    medium: "w-48",
    wide: "w-96",
  };

  const handleWidthChange = (column, width) => {
    setColumnWidths((prev) => ({
      ...prev,
      [column]: width,
    }));
  };

  return (
    <div className="border border-[#52796f] rounded-md overflow-hidden">
      <div className="bg-[#2f3e46] p-2">
        <h3 className="text-[#cad2c5] font-medium">
          Fixed Width Categories Example
        </h3>
      </div>

      <div className="overflow-x-auto scrollbar-visible">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#2f3e46] border-b border-[#52796f] sticky top-0 z-10">
            <tr>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left w-10">
                #
              </th>

              <th
                className={`text-[#84a98c] font-normal text-sm p-3 text-left ${widthMap[columnWidths.name]}`}
              >
                <div className="flex items-center justify-between">
                  <span>Name</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="h-3 w-3 text-[#84a98c]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#2f3e46] border-[#52796f]"
                    >
                      <DropdownMenuCheckboxItem
                        checked={columnWidths.name === "narrow"}
                        onCheckedChange={() =>
                          handleWidthChange("name", "narrow")
                        }
                        className="text-[#cad2c5]"
                      >
                        Narrow
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={columnWidths.name === "medium"}
                        onCheckedChange={() =>
                          handleWidthChange("name", "medium")
                        }
                        className="text-[#cad2c5]"
                      >
                        Medium
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={columnWidths.name === "wide"}
                        onCheckedChange={() =>
                          handleWidthChange("name", "wide")
                        }
                        className="text-[#cad2c5]"
                      >
                        Wide
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </th>

              <th
                className={`text-[#84a98c] font-normal text-sm p-3 text-left ${widthMap[columnWidths.status]}`}
              >
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="h-3 w-3 text-[#84a98c]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#2f3e46] border-[#52796f]"
                    >
                      <DropdownMenuCheckboxItem
                        checked={columnWidths.status === "narrow"}
                        onCheckedChange={() =>
                          handleWidthChange("status", "narrow")
                        }
                        className="text-[#cad2c5]"
                      >
                        Narrow
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={columnWidths.status === "medium"}
                        onCheckedChange={() =>
                          handleWidthChange("status", "medium")
                        }
                        className="text-[#cad2c5]"
                      >
                        Medium
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={columnWidths.status === "wide"}
                        onCheckedChange={() =>
                          handleWidthChange("status", "wide")
                        }
                        className="text-[#cad2c5]"
                      >
                        Wide
                      </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </th>

              {/* Similar pattern for other columns */}
              <th
                className={`text-[#84a98c] font-normal text-sm p-3 text-left ${widthMap[columnWidths.date]}`}
              >
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Settings className="h-3 w-3 text-[#84a98c]" />
                  </Button>
                </div>
              </th>

              <th
                className={`text-[#84a98c] font-normal text-sm p-3 text-left ${widthMap[columnWidths.description]}`}
              >
                <div className="flex items-center justify-between">
                  <span>Description</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Settings className="h-3 w-3 text-[#84a98c]" />
                  </Button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-[#354f52]/50 transition-colors">
                <td className="text-[#cad2c5] p-3">{i}</td>
                <td className="text-[#cad2c5] p-3">Sample Item {i}</td>
                <td className="text-[#cad2c5] p-3">
                  {i === 1 ? "Active" : i === 2 ? "Pending" : "Inactive"}
                </td>
                <td className="text-[#cad2c5] p-3">2024-03-2{i}</td>
                <td className="text-[#cad2c5] p-3">
                  This is a sample description for item {i}.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Example 3: Column visibility toggles
export const ColumnVisibilityExample = () => {
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    status: true,
    date: true,
    description: true,
  });

  const toggleColumn = (column) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  return (
    <div className="border border-[#52796f] rounded-md overflow-hidden">
      <div className="bg-[#2f3e46] p-2 flex justify-between items-center">
        <h3 className="text-[#cad2c5] font-medium">
          Column Visibility Example
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-[#52796f] text-[#84a98c] hover:bg-[#354f52]/50 hover:text-[#cad2c5]"
            >
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#2f3e46] border-[#52796f]"
          >
            <DropdownMenuCheckboxItem
              checked={visibleColumns.name}
              onCheckedChange={() => toggleColumn("name")}
              className="text-[#cad2c5]"
            >
              Name
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.status}
              onCheckedChange={() => toggleColumn("status")}
              className="text-[#cad2c5]"
            >
              Status
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.date}
              onCheckedChange={() => toggleColumn("date")}
              className="text-[#cad2c5]"
            >
              Date
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={visibleColumns.description}
              onCheckedChange={() => toggleColumn("description")}
              className="text-[#cad2c5]"
            >
              Description
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto scrollbar-visible">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#2f3e46] border-b border-[#52796f] sticky top-0 z-10">
            <tr>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                #
              </th>
              {visibleColumns.name && (
                <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                  Name
                </th>
              )}
              {visibleColumns.status && (
                <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                  Status
                </th>
              )}
              {visibleColumns.date && (
                <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                  Date
                </th>
              )}
              {visibleColumns.description && (
                <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                  Description
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-[#354f52]/50 transition-colors">
                <td className="text-[#cad2c5] p-3">{i}</td>
                {visibleColumns.name && (
                  <td className="text-[#cad2c5] p-3">Sample Item {i}</td>
                )}
                {visibleColumns.status && (
                  <td className="text-[#cad2c5] p-3">
                    {i === 1 ? "Active" : i === 2 ? "Pending" : "Inactive"}
                  </td>
                )}
                {visibleColumns.date && (
                  <td className="text-[#cad2c5] p-3">2024-03-2{i}</td>
                )}
                {visibleColumns.description && (
                  <td className="text-[#cad2c5] p-3">
                    This is a sample description for item {i}.
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Example 4: Expandable rows with details
export const ExpandableRowsExample = () => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRow = (rowId: number) => {
    setExpandedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId],
    );
  };

  return (
    <div className="border border-[#52796f] rounded-md overflow-hidden">
      <div className="bg-[#2f3e46] p-2">
        <h3 className="text-[#cad2c5] font-medium">Expandable Rows Example</h3>
      </div>

      <div className="overflow-x-auto scrollbar-visible">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#2f3e46] border-b border-[#52796f] sticky top-0 z-10">
            <tr>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left w-10"></th>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                #
              </th>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                Name
              </th>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                Status
              </th>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <tr
                  className="hover:bg-[#354f52]/50 transition-colors cursor-pointer"
                  onClick={() => toggleRow(i)}
                >
                  <td className="text-[#cad2c5] p-3">
                    {expandedRows.includes(i) ? (
                      <ChevronDown className="h-4 w-4 text-[#84a98c]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#84a98c]" />
                    )}
                  </td>
                  <td className="text-[#cad2c5] p-3">{i}</td>
                  <td className="text-[#cad2c5] p-3">Sample Item {i}</td>
                  <td className="text-[#cad2c5] p-3">
                    {i === 1 ? "Active" : i === 2 ? "Pending" : "Inactive"}
                  </td>
                  <td className="text-[#cad2c5] p-3">2024-03-2{i}</td>
                </tr>
                {expandedRows.includes(i) && (
                  <tr>
                    <td className="p-0"></td>
                    <td colSpan={4} className="bg-[#2f3e46]/50 p-4">
                      <div className="text-[#cad2c5]">
                        <h4 className="font-medium mb-2">Additional Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[#84a98c] text-sm">
                              Description
                            </p>
                            <p>
                              This is a detailed description for Sample Item {i}
                              .
                            </p>
                          </div>
                          <div>
                            <p className="text-[#84a98c] text-sm">Created By</p>
                            <p>John Doe</p>
                          </div>
                          <div>
                            <p className="text-[#84a98c] text-sm">
                              Last Modified
                            </p>
                            <p>2024-03-25 14:30</p>
                          </div>
                          <div>
                            <p className="text-[#84a98c] text-sm">Category</p>
                            <p>Sample Category</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Example 5: Smart column width distribution
export const SmartWidthDistributionExample = () => {
  return (
    <div className="border border-[#52796f] rounded-md overflow-hidden">
      <div className="bg-[#2f3e46] p-2">
        <h3 className="text-[#cad2c5] font-medium">
          Smart Width Distribution Example
        </h3>
        <p className="text-[#84a98c] text-xs">
          Columns are sized based on content type: ID (narrow), Date (medium),
          Text (flexible), Description (wide)
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-visible">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#2f3e46] border-b border-[#52796f] sticky top-0 z-10">
            <tr>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left w-16">
                ID
              </th>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left w-1/4">
                Name
              </th>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left w-32">
                Status
              </th>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left w-40">
                Date
              </th>
              <th className="text-[#84a98c] font-normal text-sm p-3 text-left">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-[#354f52]/50 transition-colors">
                <td className="text-[#cad2c5] p-3">{i}</td>
                <td className="text-[#cad2c5] p-3">Sample Item {i}</td>
                <td className="text-[#cad2c5] p-3">
                  {i === 1 ? "Active" : i === 2 ? "Pending" : "Inactive"}
                </td>
                <td className="text-[#cad2c5] p-3">2024-03-2{i}</td>
                <td className="text-[#cad2c5] p-3">
                  This is a sample description for item {i}. It contains more
                  text to demonstrate how the column expands to fill available
                  space.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
