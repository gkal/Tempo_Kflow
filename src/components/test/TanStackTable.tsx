import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import SimpleTable from "../ui/virtual-table/SimpleTable";
import { TableWrapper } from "../ui/virtual-table/TableWrapper";

interface TestItem {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

// Generate test data
const generateTestData = (count: number): TestItem[] => {
  return Array(count).fill(null).map((_, i) => ({
    id: `item-${i}`,
    name: `Test Item ${i}`,
    email: `test${i}@example.com`,
    status: i % 3 === 0 ? "active" : "inactive",
    createdAt: new Date().toISOString(),
  }));
};

// Create test data
const TEST_DATA = generateTestData(50);

export default function TanStackTable() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [data, setData] = useState<TestItem[]>(TEST_DATA);
  const [isLoading, setIsLoading] = useState(false);

  // Define columns
  const columns: ColumnDef<TestItem>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        return <div>{row.original.name}</div>;
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        return <div>{row.original.email}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        return (
          <div
            className={`px-2 py-1 rounded-full text-xs ${
              row.original.status === "active"
                ? "bg-green-500/20 text-green-500"
                : "bg-red-500/20 text-red-500"
            }`}
          >
            {row.original.status}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        return <div>{new Date(row.original.createdAt).toLocaleDateString()}</div>;
      },
    },
  ];

  // Handle toggle expand
  const handleToggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Check if row is expanded
  const isRowExpanded = (id: string) => expandedRows.has(id);

  // Render expanded content
  const renderExpanded = (item: TestItem) => {
    return (
      <div className="p-4 bg-[#354f52] text-[#cad2c5]">
        <h3 className="text-lg font-medium">Details for {item.name}</h3>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <p><strong>ID:</strong> {item.id}</p>
            <p><strong>Name:</strong> {item.name}</p>
          </div>
          <div>
            <p><strong>Email:</strong> {item.email}</p>
            <p><strong>Status:</strong> {item.status}</p>
          </div>
        </div>
      </div>
    );
  };

  // Function to reload data with simulated loading
  const handleReloadData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setData(generateTestData(50));
      setIsLoading(false);
    }, 1000);
  };

  // Function to mock fetch data for TableWrapper
  const fetchData = async (options: any) => {
    console.log("Fetching data with options:", options);
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const { pageIndex = 0, pageSize = 10 } = options;
    const startIdx = pageIndex * pageSize;
    const endIdx = startIdx + pageSize;
    
    // Generate data for the current page
    const pageData = generateTestData(pageSize).map((item, idx) => ({
      ...item,
      id: `item-${startIdx + idx}`,
      name: `Test Item ${startIdx + idx}`,
      email: `test${startIdx + idx}@example.com`,
    }));
    
    return {
      data: pageData,
      totalCount: 200 // Mock total count
    };
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">TanStack Table Test</h1>
        <Button onClick={handleReloadData} disabled={isLoading}>
          {isLoading ? "Loading..." : "Reload Data"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#2f3e46] rounded-lg p-4">
          <h2 className="text-xl font-bold text-white mb-4">Simple Table</h2>
          <SimpleTable
            data={data}
            columns={columns}
            renderExpanded={renderExpanded}
            isRowExpanded={isRowExpanded}
            onToggleExpand={handleToggleExpand}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
          />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-4">TableWrapper</h2>
          <TableWrapper
            title="Test Data"
            description="This table uses TableWrapper with pagination and filtering"
            columns={columns}
            fetchData={fetchData}
            initialPageSize={10}
            renderExpanded={renderExpanded}
            keyExtractor={(item) => item.id}
            noDataMessage="No test data available"
          />
        </div>
      </div>

      <div className="mt-4 p-4 bg-yellow-100 text-black rounded">
        <h2 className="font-bold">Debug Information</h2>
        <p>Total rows: {data.length}</p>
        <p>Expanded rows: {expandedRows.size}</p>
        <div className="mt-2">
          <h3 className="font-bold">Expanded Row IDs:</h3>
          <ul>
            {Array.from(expandedRows).map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 