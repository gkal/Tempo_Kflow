import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2, ArrowLeft, Edit, Filter } from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

// Add a custom sorting function
const customSort = (a, b) => {
  const nameA = a.company_name.toLowerCase(); // Convert to lowercase
  const nameB = b.company_name.toLowerCase(); // Convert to lowercase
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
};

// Create a separate component for the cell
const ActionCell = ({ customer, onEdit, onDelete, onShowDeleteDialog, isAdmin }) => {
  // It's safe to use hooks in a component
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Make role check case-insensitive
  const isAdminUser = user?.role?.toLowerCase() === 'admin' || 
                      user?.role?.toLowerCase() === 'super_user';
  
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/customers/${customer.id}`);
        }}
        className="h-8 w-8 p-0 text-[#84a98c] hover:text-[#cad2c5] hover:bg-[#354f52]"
      >
        <span className="sr-only">View details</span>
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(customer);
        }}
        className="h-8 w-8 p-0 text-[#84a98c] hover:text-[#cad2c5] hover:bg-[#354f52]"
      >
        <span className="sr-only">Edit</span>
        <Edit className="h-4 w-4" />
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onShowDeleteDialog(customer);
              }}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-[#354f52]"
            >
              <span className="sr-only">Delete</span>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isAdmin ? "Οριστική διαγραφή" : "Απενεργοποίηση"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Make role check case-insensitive
  const isAdminOrSuperUser = user?.role?.toLowerCase() === 'admin' || 
                            user?.role?.toLowerCase() === 'super_user';
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("company_name");
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formValid, setFormValid] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState("active"); // "active", "inactive", "all"
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");

  // Define searchColumns here, before it's used in the useEffect hook
  const searchColumns = [
    { header: "Επωνυμία", accessor: "company_name" },
    { header: "Τύπος", accessor: "customer_type" },
    { header: "ΑΦΜ", accessor: "afm" },
    { header: "Email", accessor: "email" },
    { header: "Τηλέφωνο", accessor: "telephone" },
    { header: "Διεύθυνση", accessor: "address" },
  ];

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      
      // Build the query based on the status filter
      let query = supabase.from("customers").select("*");
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      // Sort the customers
      const sortedCustomers = data
        ? data.sort((a, b) => {
            const nameA = a.company_name.toLowerCase();
            const nameB = b.company_name.toLowerCase();
            return nameA.localeCompare(nameB);
          })
        : [];

      setCustomers(sortedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user, refreshTrigger, statusFilter]);

  useEffect(() => {
    // Convert searchColumns to the format expected by the GlobalDropdown
    const dropdownOptions = searchColumns.map(col => ({
      value: col.accessor,
      label: col.header
    }));
    setOptions(dropdownOptions);
    
    // Initialize selectedColumn only once when the component mounts
    if (!selectedColumn && searchColumn) {
      setSelectedColumn(searchColumn);
    }
  }, []); // Empty dependency array means this runs only once when component mounts

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

  const refreshCustomers = () => {
    setRefreshTrigger(prev => prev + 1);
  };

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
            onSave={refreshCustomers}
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

  const handleDelete = async (customerId: string) => {
    if (!customerId) return;
    
    try {
      // Make role check case-insensitive
      const isAdminOrSuperUser = user?.role?.toLowerCase() === 'admin' || 
                                user?.role?.toLowerCase() === 'super_user';
      
      if (isAdminOrSuperUser) {
        // For admin/super users: Perform actual deletion
        // First delete all contacts associated with this customer
        const { error: contactsError } = await supabase
          .from('contacts')
          .delete()
          .eq('customer_id', customerId);
        
        if (contactsError) throw contactsError;
        
        // Then delete the customer record
        const { error: customerError } = await supabase
          .from('customers')
          .delete()
          .eq('id', customerId);
        
        if (customerError) throw customerError;
        
        toast({
          title: "Επιτυχής διαγραφή",
          description: "Ο πελάτης και όλες οι επαφές του διαγράφηκαν οριστικά.",
          variant: "default",
        });
      } else {
        // For regular users: Just mark as inactive
        const { error } = await supabase
          .from('customers')
          .update({ 
            status: 'inactive',
            modified_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId);
        
        if (error) throw error;
        
        toast({
          title: "Επιτυχής απενεργοποίηση",
          description: "Ο πελάτης έχει απενεργοποιηθεί και δεν θα εμφανίζεται πλέον στη λίστα.",
          variant: "default",
        });
      }
      
      // Refresh the customer list
      fetchCustomers();
    } catch (error) {
      console.error('Error processing customer:', error);
      toast({
        title: "Σφάλμα",
        description: "Υπήρξε πρόβλημα κατά την επεξεργασία του πελάτη.",
        variant: "destructive",
      });
    }
  };

  const columns = [
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
      id: "actions",
      header: "Actions",
      cell: (_, row) => {
        if (!row) return null;
        
        return (
          <ActionCell 
            customer={row} 
            onEdit={handleEditCustomer} 
            onDelete={handleDelete}
            onShowDeleteDialog={(customer) => {
              setCustomerToDelete(customer);
              setShowDeleteDialog(true);
            }}
            isAdmin={isAdminOrSuperUser}
          />
        );
      },
    },
  ];

  const handleColumnChange = (column: string) => {
    setSelectedColumn(column);
    setSearchColumn(column); // Update the searchColumn state as well
  };

  return (
    <div className="p-4">
      <div className="mb-2 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#cad2c5]">
          Διαχείριση Πελατών
        </h1>
        <Button
          onClick={() => {
            setSelectedCustomer(null);
            setShowForm(true);
            setFormValid(false);
          }}
          className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Νέος Πελάτης
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex justify-center">
          <SearchBar
            onChange={(value) => setSearchTerm(value)}
            value={searchTerm}
            options={options}
            selectedColumn={selectedColumn}
            onColumnChange={handleColumnChange}
          />
        </div>
        
        <div className="flex justify-end">
          <CustomDropdown
            options={[
              { value: "active", label: "Ενεργοί" },
              { value: "inactive", label: "Ανενεργοί" },
              { value: "all", label: "Όλοι" }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Επιλέξτε κατάσταση"
            className="w-[180px]"
          />
        </div>
      </div>

      <DataTableBase
        columns={columns}
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
            <AlertDialogTitle>
              {isAdminOrSuperUser 
                ? "Οριστική Διαγραφή Πελάτη" 
                : "Απενεργοποίηση Πελάτη"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              {isAdminOrSuperUser
                ? `Είστε σίγουροι ότι θέλετε να διαγράψετε οριστικά τον πελάτη "${customerToDelete?.company_name}" και όλες τις επαφές του; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
                : `Είστε σίγουροι ότι θέλετε να απενεργοποιήσετε τον πελάτη "${customerToDelete?.company_name}";`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                handleDelete(customerToDelete?.id);
                setShowDeleteDialog(false);
                setCustomerToDelete(null);
              }}
            >
              {isAdminOrSuperUser 
                ? "Διαγραφή" 
                : "Απενεργοποίηση"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}