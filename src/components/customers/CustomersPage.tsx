import { useState, useEffect } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DataTableBase } from "@/components/ui/data-table-base";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/lib/utils";

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("name");

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      // TODO: Add proper error handling/notification here
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user]);

  const handleRowClick = (row) => {
    // TODO: Implement customer details/edit dialog
    console.log("Customer clicked:", row);
  };

  const searchColumns = [
    { header: "Όνομα", accessor: "name" },
    { header: "ΑΦΜ", accessor: "vat" },
    { header: "Email", accessor: "email" },
    { header: "Τηλέφωνο", accessor: "phone" },
    { header: "Διεύθυνση", accessor: "address" },
  ];

  return (
    <div className="p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
          Διαχείριση Πελατών
        </h1>
        <Button
          onClick={() => {
            // TODO: Implement new customer dialog
            console.log("Add new customer");
          }}
          className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] mb-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Νέος Πελάτης
        </Button>
      </div>

      <div className="flex justify-center mb-4">
        <SearchBar
          onChange={(value) => setSearchTerm(value)}
          value={searchTerm}
          columns={searchColumns}
          selectedColumn={searchColumn}
          onColumnChange={(column) => setSearchColumn(column)}
        />
      </div>

      <DataTableBase
        columns={[
          { header: "Όνομα", accessor: "name" },
          { header: "ΑΦΜ", accessor: "vat" },
          { header: "Email", accessor: "email" },
          { header: "Τηλέφωνο", accessor: "phone" },
          { header: "Διεύθυνση", accessor: "address" },
          {
            header: "Ημ/νία Δημιουργίας",
            accessor: "created_at",
            cell: (value) => formatDateTime(value),
          },
          {
            header: "Κατάσταση",
            accessor: "status",
            cell: (value) => (
              <span
                className={`px-2 py-1 rounded-full text-xs ${value === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
              >
                {value === "active" ? "Ενεργός" : "Ανενεργός"}
              </span>
            ),
          },
        ]}
        data={customers}
        defaultSortColumn="name"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        onRowClick={handleRowClick}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName="hover:bg-[#354f52]/50 cursor-pointer"
      />
    </div>
  );
}
