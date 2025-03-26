import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
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
import { supabase } from '@/lib/supabaseClient';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import VirtualCustomersTable, { CustomerFilters } from "./VirtualCustomersTable";
import { CustomerDialog } from "./CustomerDialog";
import { openNewOfferDialog, openEditOfferDialog } from './OfferDialogManager';

// Add this at the top level
const APP_VERSION = "2.0.0"; // Updated with virtualized table using TanStack Table + React Virtual

export default function EnhancedCustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // These must match exactly what's allowed in the database
  const customerTypeOptions = ["Εταιρεία", "Ιδιώτης", "Δημόσιο", "Οικοδομές", "Εκτακτος Πελάτης", "Εκτακτη Εταιρία"];
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('company_name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  
  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  
  // Offer deletion state
  const [showDeleteOfferDialog, setShowDeleteOfferDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<{customerId: string, offerId: string} | null>(null);
  
  // Define the table filter state
  const [tableFilters, setTableFilters] = useState<CustomerFilters>({
    searchTerm: '',
    searchColumn: 'company_name',
    statusFilter: 'all',
    customerTypes: []
  });
  
  // Update table filters when UI filters change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      setTableFilters({
        searchTerm,
        searchColumn,
        statusFilter,
        customerTypes: selectedCustomerTypes
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, searchColumn, statusFilter, selectedCustomerTypes]);
  
  // Add search columns definition
  const searchColumns = [
    { accessor: 'company_name', header: 'Επωνυμία' },
    { accessor: 'first_name', header: 'Όνομα' },
    { accessor: 'last_name', header: 'Επώνυμο' },
    { accessor: 'tax_id', header: 'ΑΦΜ' },
    { accessor: 'email', header: 'Email' },
    { accessor: 'phone', header: 'Τηλέφωνο' }
  ];
  
  // Define handlers for customer actions
  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setShowDialog(true);
  };
  
  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setShowDialog(true);
  };
  
  const handleDeleteCustomer = (customer: any) => {
    setCustomerToDelete(customer);
    setShowDeleteAlert(true);
  };
  
  // Define handlers for offers
  const handleCreateOffer = (customerId: string, source: string = "Email") => {
    // Open the dialog
    openNewOfferDialog(customerId, source, () => {
      // Force refresh data to show the new offer
      // This will be handled by the subscription in the real implementation
    });
  };
  
  const handleEditOffer = (customerId: string, offerId: string) => {
    openEditOfferDialog(customerId, offerId, () => {
      // Force refresh data if needed
    });
  };
  
  const handleDeleteOffer = (customerId: string, offerId: string) => {
    setOfferToDelete({ customerId, offerId });
    setShowDeleteOfferDialog(true);
  };
  
  // Add the confirmDeleteOffer function 
  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return;
    
    try {
      // Try soft delete first
      let error = null;
      try {
        const response = await supabase.rpc('soft_delete_record', {
          table_name: 'offers',
          record_id: offerToDelete.offerId
        });
        error = response.error;
      } catch (softDeleteError) {
        // If soft delete is not available, fallback to regular delete
        const response = await supabase
          .from('offers')
          .delete()
          .eq('id', offerToDelete.offerId);
        error = response.error;
      }
      
      if (error) throw error;
      
      // Show success toast
      toast({
        title: "Επιτυχία",
        description: "Η προσφορά διαγράφηκε επιτυχώς",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η διαγραφή της προσφοράς",
        variant: "destructive",
      });
    } finally {
      setShowDeleteOfferDialog(false);
      setOfferToDelete(null);
    }
  };
  
  // Handle column change
  const handleColumnChange = (column: string) => {
    setSearchColumn(column);
  };
  
  // Handle customer type filter change
  const handleCustomerTypeChange = (types: string[]) => {
    setSelectedCustomerTypes(types);
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    if (statusFilter !== status) {
      setStatusFilter(status);
    }
  };
  
  // CustomerTypeFilter Component
  const CustomerTypeFilter = ({ 
    availableTypes, 
    selectedTypes, 
    onChange 
  }: {
    availableTypes: string[],
    selectedTypes: string[],
    onChange: (types: string[]) => void
  }) => {
    const allSelected = selectedTypes.length === 0;
    const [isOpen, setIsOpen] = useState(false);
    
    const handleToggleType = (type: string) => {
      let newSelectedTypes: string[];
      
      if (selectedTypes.includes(type)) {
        // If already selected, remove it
        newSelectedTypes = selectedTypes.filter(t => t !== type);
      } else {
        // If not selected, add it
        newSelectedTypes = [...selectedTypes, type];
      }
      
      onChange(newSelectedTypes);
    };
    
    const handleSelectAll = () => {
      // If anything is selected, clear selection
      onChange([]);
    };

    // Determine if filter is active
    const isFilterActive = selectedTypes.length > 0;

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className={`h-9 px-4 flex items-center gap-2 w-[102px] justify-between ${
              isFilterActive 
                ? 'bg-[#52796f] text-white border-0 shadow-[0_0_35px_8px_rgba(82,121,111,0.95)]' 
                : 'hover:bg-[#354f52] bg-[#2f3e46] border-0 text-[#cad2c5]'
            }`}
            title="Φίλτρο Τύπων Πελατών"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Τύπος</span>
            </div>
            {isFilterActive ? 
              <div className="w-4 h-4 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-yellow-300"
                >
                  <path d="M9 18h6"></path>
                  <path d="M10 22h4"></path>
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
                </svg>
              </div>
              : 
              <div className="w-4 h-4"></div>
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-0 bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] shadow-md overflow-hidden"
          align="center"
          sideOffset={8}
        >
          <div className="bg-[#2f3e46] text-[#cad2c5]">
            <button
              className="w-full text-left bg-[#2f3e46] text-[#cad2c5] hover:bg-[#354f52] transition-colors duration-150 px-3 py-2 flex items-center gap-2 cursor-pointer"
              onClick={handleSelectAll}
            >
              {allSelected ? (
                <Check className="h-4 w-4 mr-2 text-[#84a98c]" />
              ) : (
                <div className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm">Όλοι οι τύποι</span>
            </button>
            
            <div className="h-px bg-[#52796f]/30 mx-3 my-1"></div>
            
            {customerTypeOptions.map((type) => (
              <button
                key={type}
                className="w-full text-left bg-[#2f3e46] text-[#cad2c5] hover:bg-[#354f52] transition-colors duration-150 px-3 py-2 flex items-center gap-2 cursor-pointer"
                onClick={() => handleToggleType(type)}
              >
                {selectedTypes.includes(type) ? (
                  <Check className="h-4 w-4 mr-2 text-[#84a98c]" />
                ) : (
                  <div className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm">{type}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };
  
  return (
    <div className="p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
          Διαχείριση Πελατών
        </h1>
        <Button
          onClick={handleCreateCustomer}
          className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
        >
          <Plus className="h-4 w-4 text-white" />
          Νέος Πελάτης
        </Button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="w-1/4">
          {/* Keep area empty as per original */}
        </div>
        
        <div className="flex-1 flex justify-center items-center gap-2">
          <SearchBar
            placeholder="Αναζήτηση..."
            value={searchTerm}
            onChange={setSearchTerm}
            options={searchColumns.map(col => ({ value: col.accessor, label: col.header }))}
            selectedColumn={searchColumn}
            onColumnChange={handleColumnChange}
          />
          <CustomerTypeFilter
            availableTypes={customerTypeOptions}
            selectedTypes={selectedCustomerTypes}
            onChange={handleCustomerTypeChange}
          />
        </div>
        
        <div className="flex items-center gap-2 w-1/4 justify-end">
          {/* Status filters styled as in the DataTableBase */}
          <div className="flex items-center gap-2">
            <div 
              onClick={() => handleStatusFilterChange("all")}
              className="relative inline-block min-w-[70px] cursor-pointer"
            >
              <span className={`text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${statusFilter === "all" 
                  ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(59,130,246,0.3)] ring-blue-400/50" 
                  : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
              >
                Όλοι
              </span>
            </div>
            
            <div 
              onClick={() => handleStatusFilterChange("active")}
              className="relative inline-block min-w-[70px] cursor-pointer"
            >
              <span className={`text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${statusFilter === "active" 
                  ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
                  : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
              >
                Ενεργός
              </span>
            </div>
            
            <div 
              onClick={() => handleStatusFilterChange("inactive")}
              className="relative inline-block min-w-[70px] cursor-pointer"
            >
              <span className={`text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
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

      {/* Virtualized Customer Table */}
      <div className="bg-[#2f3e46] rounded-lg overflow-hidden shadow-lg border border-[#52796f]/30">
        <VirtualCustomersTable
          onCreateCustomer={handleCreateCustomer}
          onEditCustomer={handleEditCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onCreateOffer={handleCreateOffer}
          onEditOffer={handleEditOffer}
          onDeleteOffer={handleDeleteOffer}
        />
        
        {/* Debug panel in development mode */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="p-2 bg-yellow-100 text-black text-xs">
            <p>Current filters:</p>
            <pre className="overflow-auto max-h-24">
              {JSON.stringify(tableFilters, null, 2)}
            </pre>
            <p className="mt-1">If table is not rendering, check console for errors</p>
            <div className="mt-1 flex space-x-2">
              <button 
                onClick={() => window.location.reload()}
                className="px-2 py-1 bg-blue-500 text-white rounded"
              >
                Reload Page
              </button>
            </div>
          </div>
        )}
      </div>
      
      <CustomerDialog
        open={showDialog}
        onOpenChange={(open) => setShowDialog(open)}
        customer={selectedCustomer ? {
          ...selectedCustomer,
          id: typeof selectedCustomer.id === 'string' 
            ? selectedCustomer.id 
            : String(selectedCustomer.id)
        } : undefined}
        refreshData={() => {
          // Handle refresh - no need for explicit refresh with real-time subscription
        }}
      />

      {/* Delete Customer Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="delete-customer-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Διαγραφή Πελάτη</AlertDialogTitle>
            <AlertDialogDescription id="delete-customer-description" className="text-[#84a98c]">
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!customerToDelete || isDeletingCustomer) return;
                
                try {
                  setIsDeletingCustomer(true);
                  
                  // Try soft delete first using RPC
                  let error = null;
                  try {
                    const response = await supabase.rpc('soft_delete_record', {
                      table_name: 'customers',
                      record_id: customerToDelete.id
                    });
                    error = response.error;
                  } catch (softDeleteError) {
                    // If soft delete is not available, fallback to regular delete
                    const response = await supabase
                      .from('customers')
                      .delete()
                      .eq('id', customerToDelete.id);
                    error = response.error;
                  }
                  
                  if (error) throw error;
                  
                  // Show success message
                  toast({
                    title: "Επιτυχία",
                    description: "Ο πελάτης διαγράφηκε επιτυχώς",
                    variant: "default",
                  });
                } catch (error) {
                  console.error("Error deleting customer:", error);
                  toast({
                    title: "Σφάλμα",
                    description: "Δεν ήταν δυνατή η διαγραφή του πελάτη",
                    variant: "destructive",
                  });
                } finally {
                  setIsDeletingCustomer(false);
                  setShowDeleteAlert(false);
                  setCustomerToDelete(null);
                }
              }}
              disabled={isDeletingCustomer}
            >
              {isDeletingCustomer ? "Διαγραφή..." : "Διαγραφή"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Offer Confirmation */}
      <AlertDialog open={showDeleteOfferDialog} onOpenChange={setShowDeleteOfferDialog}>
        <AlertDialogContent 
          className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="delete-offer-description"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#cad2c5]">Διαγραφή Προσφοράς</AlertDialogTitle>
            <AlertDialogDescription id="delete-offer-description" className="text-[#84a98c]">
              Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την προσφορά; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#354f52] text-[#cad2c5] hover:bg-[#354f52]/90">
              Άκυρο
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeleteOffer}
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 