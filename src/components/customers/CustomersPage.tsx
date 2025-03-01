import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { DataTableBase } from "@/components/ui/data-table-base";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/lib/utils";
import CustomerForm from "./CustomerForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("company_name");
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formValid, setFormValid] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("status", "active")
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

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowForm(true);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      const { error } = await supabase
        .from("customers")
        .update({
          status: "inactive",
          modified_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerToDelete.id);

      if (error) throw error;
      await fetchCustomers();
    } catch (error) {
      console.error("Error deactivating customer:", error);
    } finally {
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    }
  };

  const searchColumns = [
    { header: "Επωνυμία", accessor: "company_name" },
    { header: "Τύπος", accessor: "customer_type" },
    { header: "ΑΦΜ", accessor: "afm" },
    { header: "Email", accessor: "email" },
    { header: "Τηλέφωνο", accessor: "telephone" },
    { header: "Διεύθυνση", accessor: "address" },
  ];

  // If showing the form, render it instead of the customer list
  if (showForm) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 p-4 bg-[#354f52] border-b border-[#52796f]">
          <h1 className="text-xl font-bold text-[#a8c5b5]">
            {selectedCustomer ? (
              <>
                <span>{selectedCustomer.company_name}</span>{" "}
                <span className="text-sm font-normal text-[#84a98c]">
                  ({selectedCustomer.customer_type || "Εταιρεία"})
                </span>
              </>
            ) : (
              "Νέος Πελάτης"
            )}
          </h1>
          <div className="flex items-center space-x-2">
            <Button
              form="customer-form"
              type="submit"
              disabled={!formValid}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-white rounded-md px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Αποθήκευση
            </Button>
            <CloseButton
              size="md"
              onClick={() => {
                setShowForm(false);
                setSelectedCustomer(null);
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto relative">
          <CustomerForm
            customerId={selectedCustomer?.id}
            onSave={() => {
              fetchCustomers();
              setShowForm(false);
              setSelectedCustomer(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setSelectedCustomer(null);
            }}
            onValidityChange={setFormValid}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
          Διαχείριση Πελατών
        </h1>
        <Button
          onClick={() => {
            setSelectedCustomer(null);
            setShowForm(true);
            setFormValid(false);
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
          { header: "Επωνυμία", accessor: "company_name" },
          { header: "Τύπος", accessor: "customer_type" },
          { header: "ΑΦΜ", accessor: "afm" },
          { header: "Email", accessor: "email" },
          { header: "Τηλέφωνο", accessor: "telephone" },
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
          {
            header: "",
            accessor: "actions",
            sortable: false,
            cell: (_, row) => (
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/customers/${row.id}`);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCustomer(row);
                    setFormValid(true); // Existing customers already have required fields
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-[#354f52] text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomerToDelete(row);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={customers}
        defaultSortColumn="company_name"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName="hover:bg-[#354f52]/50 cursor-pointer group"
      />

      {/* Delete Customer Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle>Απενεργοποίηση Πελάτη</AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              Είστε σίγουροι ότι θέλετε να απενεργοποιήσετε τον πελάτη{" "}
              {customerToDelete?.company_name};
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteCustomer}
            >
              Απενεργοποίηση
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
