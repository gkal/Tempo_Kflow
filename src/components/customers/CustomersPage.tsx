import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2, ArrowLeft, Edit, Filter, EyeOff } from "lucide-react";
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
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";

// Add Customer interface
interface Customer {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  status: string;
  [key: string]: any;
}

// Add a custom sorting function
const customSort = (a, b) => {
  const nameA = a.company_name.toLowerCase(); // Convert to lowercase
  const nameB = b.company_name.toLowerCase(); // Convert to lowercase
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  return 0;
};

// ActionCell component has been removed as it's no longer used

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Make role check case-insensitive
  const isAdminUser = user?.role?.toLowerCase() === 'admin';
  const isAdminOrSuperUser = isAdminUser || 
                            user?.role?.toLowerCase() === 'moderator' ||
                            user?.role?.toLowerCase() === 'super user';
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
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
  const [lastUpdatedCustomerId, setLastUpdatedCustomerId] = useState<string | null>(null);

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
      setFilteredCustomers(sortedCustomers);
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

  const handleDelete = async (customerId) => {
    if (!customerId) return;
    
    try {
      // Make role check case-insensitive
      const isAdminUser = user?.role?.toLowerCase() === 'admin';
      
      if (isAdminUser) {
        // For admin users: Perform actual deletion
        
        // First delete all contacts associated with this customer
        await supabase
          .from('contacts')
          .delete()
          .eq('customer_id', customerId);
        
        // Then delete the customer
        await supabase
          .from('customers')
          .delete()
          .eq('id', customerId);
        
        // Update the customers array
        setCustomers(prevCustomers => 
          prevCustomers.filter(c => c.id !== customerId)
        );
        
        // Update the filtered customers array
        setFilteredCustomers(prevFiltered => 
          prevFiltered.filter(c => c.id !== customerId)
        );
        
        toast({
          title: "Επιτυχής διαγραφή",
          description: 'Ο πελάτης διαγράφηκε οριστικά με επιτυχία!',
          variant: "default",
        });
      } else {
        // For non-admin users: Just deactivate
        await supabase
          .from('customers')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId);
        
        // Update the customers array
        setCustomers(prevCustomers => 
          prevCustomers.map(c => 
            c.id === customerId ? {...c, status: 'inactive'} : c
          )
        );
        
        // Handle filtered customers based on status filter
        if (statusFilter !== 'all' && statusFilter !== 'inactive') {
          // If we're not showing inactive customers, remove from filtered view
          setFilteredCustomers(prevFiltered => 
            prevFiltered.filter(c => c.id !== customerId)
          );
        } else {
          // Otherwise update in the filtered view
          setFilteredCustomers(prevFiltered => 
            prevFiltered.map(c => c.id === customerId ? {...c, status: 'inactive'} : c)
          );
        }
        
        toast({
          title: "Επιτυχής απενεργοποίηση",
          description: 'Ο πελάτης απενεργοποιήθηκε με επιτυχία!',
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Σφάλμα",
        description: 'Σφάλμα κατά τη διαγραφή του πελάτη',
        variant: "destructive",
      });
    }
  };

  // Add toggleCustomerStatus function inside the component
  const toggleCustomerStatus = async (customer) => {
    try {
      const newStatus = customer.status === 'active' ? 'inactive' : 'active';
      
      // Update in database
      await supabase
        .from('customers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);
      
      // Update the customers array
      const updatedCustomers = customers.map(c => 
        c.id === customer.id ? {...c, status: newStatus} : c
      );
      setCustomers(updatedCustomers);
      
      // Handle filtered customers based on status filter
      if (statusFilter !== 'all' && statusFilter !== newStatus) {
        // If the new status doesn't match the filter, remove from filtered view
        setFilteredCustomers(prevFiltered => 
          prevFiltered.filter(c => c.id !== customer.id)
        );
        
        // Show success message with additional info about filter
        toast({
          title: "Επιτυχής ενημέρωση",
          description: `${newStatus === 'active' 
            ? 'Ο πελάτης ενεργοποιήθηκε' 
            : 'Ο πελάτης απενεργοποιήθηκε'} με επιτυχία! (Αφαιρέθηκε από την τρέχουσα προβολή)`,
          variant: "default",
        });
      } else {
        // If the status matches the filter or we're showing all, update in the filtered view
        setFilteredCustomers(prevFiltered => 
          prevFiltered.map(c => c.id === customer.id ? {...c, status: newStatus} : c)
        );
        
        // Set the last updated customer ID for highlighting
        setLastUpdatedCustomerId(customer.id);
        
        // Clear the highlight after 2 seconds
        setTimeout(() => {
          setLastUpdatedCustomerId(null);
        }, 2000);
        
        // Show standard success message
        toast({
          title: "Επιτυχής ενημέρωση",
          description: newStatus === 'active' 
            ? 'Ο πελάτης ενεργοποιήθηκε με επιτυχία!' 
            : 'Ο πελάτης απενεργοποιήθηκε με επιτυχία!',
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error updating customer status:", error);
      toast({
        title: "Σφάλμα",
        description: 'Σφάλμα κατά την ενημέρωση της κατάστασης του πελάτη',
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
      sortable: true,
      cell: (value, row) => {
        if (!row) return null;
        
        return (
          <div className="flex justify-center" title={value === "active" ? "Ενεργός" : "Ανενεργός"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleCustomerStatus(row);
              }}
              className={`h-8 w-8 hover:bg-[#354f52] ${value === "active" ? "text-green-400" : "text-red-400"}`}
              disabled={!isAdminOrSuperUser}
            >
              {value === "active" ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      header: "",
      accessor: "actions",
      sortable: false,
      cell: (_, row) => {
        if (!row) return null;
        
        // Only show delete button for Admin users
        if (!isAdminUser) return null;
        
        return (
          <div className="flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerToDelete(row);
                      setShowDeleteDialog(true);
                    }}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-[#354f52]"
                  >
                    <span className="sr-only">Delete</span>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Οριστική διαγραφή</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
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

      <div className="flex justify-between items-center mb-4">
        <div className="w-1/4">
          {/* Empty div to maintain layout */}
        </div>
        
        <div className="flex-1 flex justify-center">
          <SearchBar
            placeholder="Αναζήτηση..."
            value={searchTerm}
            onChange={setSearchTerm}
            options={options}
            selectedColumn={selectedColumn}
            onColumnChange={handleColumnChange}
          />
        </div>
        
        <div className="flex items-center gap-2 w-1/4 justify-end">
          {/* Status filters styled as in the DataTableBase */}
          <div className="flex items-center gap-2">
            <div 
              onClick={() => {
                setStatusFilter("all");
                setRefreshTrigger(prev => prev + 1);
              }}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${statusFilter === "all" 
                  ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(59,130,246,0.3)] ring-blue-400/50" 
                  : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
              >
                Όλοι
              </span>
            </div>
            
            <div 
              onClick={() => {
                setStatusFilter("active");
                setRefreshTrigger(prev => prev + 1);
              }}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${statusFilter === "active" 
                  ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
                  : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
              >
                Ενεργός
              </span>
            </div>
            
            <div 
              onClick={() => {
                setStatusFilter("inactive");
                setRefreshTrigger(prev => prev + 1);
              }}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${statusFilter === "inactive" 
                  ? "bg-red-500/20 text-red-400 font-medium shadow-[0_0_8px_2px_rgba(248,113,113,0.3)] ring-red-400/50" 
                  : "bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-transparent"}`}
              >
                Ανενεργός
              </span>
            </div>
          </div>
        </div>
      </div>

      <DataTableBase
        columns={columns}
        data={filteredCustomers}
        isLoading={loading}
        defaultSortColumn="company_name"
        searchTerm={searchTerm}
        searchColumn={searchColumn}
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        containerClassName="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden"
        rowClassName="hover:bg-[#354f52]/50 cursor-pointer group"
        highlightedRowId={lastUpdatedCustomerId}
      />

      {/* Delete Customer Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdminUser 
                ? "Οριστική Διαγραφή Πελάτη" 
                : customerToDelete?.status === 'active' 
                  ? "Απενεργοποίηση Πελάτη"
                  : "Ενεργοποίηση Πελάτη"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#84a98c]">
              {isAdminUser
                ? `Είστε σίγουροι ότι θέλετε να διαγράψετε οριστικά τον πελάτη "${customerToDelete?.company_name}" και όλες τις επαφές του; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
                : customerToDelete?.status === 'active'
                  ? `Είστε σίγουροι ότι θέλετε να απενεργοποιήσετε τον πελάτη "${customerToDelete?.company_name}";`
                  : `Είστε σίγουροι ότι θέλετε να ενεργοποιήσετε τον πελάτη "${customerToDelete?.company_name}";`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className={`text-white ${
                isAdminUser 
                  ? "bg-red-600 hover:bg-red-700" 
                  : customerToDelete?.status === 'active'
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
              }`}
              onClick={() => {
                if (isAdminUser) {
                  handleDelete(customerToDelete?.id);
                } else {
                  toggleCustomerStatus(customerToDelete);
                }
                setShowDeleteDialog(false);
              }}
            >
              {isAdminUser 
                ? "Διαγραφή" 
                : customerToDelete?.status === 'active'
                  ? "Απενεργοποίηση"
                  : "Ενεργοποίηση"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}