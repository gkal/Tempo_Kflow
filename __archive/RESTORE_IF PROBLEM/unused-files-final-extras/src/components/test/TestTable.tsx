import React, { useState } from "react";
import { TableHead, TableRow, TableHeader, TableBody, TableCell, Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
const TEST_DATA = generateTestData(20);

export default function TestTable() {
  const [data, setData] = useState<TestItem[]>(TEST_DATA);

  // Function to reload data
  const handleReloadData = () => {
    setData(generateTestData(20));
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Test Table</h1>
        <Button onClick={handleReloadData}>Reload Data</Button>
      </div>

      <div className="bg-[#2f3e46] rounded-lg p-4">
        <Table className="w-full">
          <TableHeader className="bg-[#354f52]">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id} className="border-b border-[#52796f]/20">
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>
                  <div
                    className={`px-2 py-1 rounded-full text-xs ${
                      item.status === "active"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {item.status}
                  </div>
                </TableCell>
                <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 