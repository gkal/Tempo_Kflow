import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createGrid, GridOptions, GridInstance } from 'fast-grid';
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Filter, Eye, EyeOff, Trash2 } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { toast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/utils/formatUtils";
import { useAuth } from "@/lib/AuthContext";
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { debounce } from "lodash";

// Define customer interface
interface Customer {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  status: string;
  customer_type?: string;
  afm?: string;
  email?: string;
  telephone?: string;
  address?: string;
  created_at?: string;
  offersCount?: number;
  [key: string]: any;
}

// Define the structure for grid rows
interface CustomerGridRow {
  id: string;
  displayName: string;
  customerType: string;
  afm: string;
  email: string;
  telephone: string;
  address: string;
  createdAt: string;
  status: 'active' | 'inactive';
  offersCount: number;
  rawData: Customer;
}

// Define pagination parameters
const PAGE_SIZE = 50;

export default function CustomersGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('company_name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridInstance, setGridInstance] = useState<GridInstance | null>(null);
  
  // Keep a reference to debounced functions
  const debouncedSearchTermRef = useRef(searchTerm);
  
  // Define isAdminOrSuperUser
  const isAdminOrSuperUser = user?.role?.toLowerCase() === 'admin' || 
                             user?.role?.toLowerCase() === 'superuser' || 
                             user?.role?.toLowerCase() === 'super user';

  // These must match exactly what's allowed in the database
  const customerTypeOptions = ["Εταιρεία", "Ιδιώτης", "Δημόσιο", "Οικοδομές", "Εκτακτος Πελάτης", "Εκτακτη Εταιρία"];
  
  // Add search columns definition
  const searchColumns = [
    { accessor: 'company_name', header: 'Επωνυμία' },
    { accessor: 'first_name', header: 'Όνομα' },
    { accessor: 'last_name', header: 'Επώνυμο' },
    { accessor: 'tax_id', header: 'ΑΦΜ' },
    { accessor: 'email', header: 'Email' },
    { accessor: 'phone', header: 'Τηλέφωνο' }
  ];

  // Create the grid when the ref is available
  useEffect(() => {
    if (gridRef.current && !gridInstance) {
      const gridOptions: GridOptions = {
        containerElement: gridRef.current,
        rowHeight: 48,
        headerHeight: 48,
        columns: [
          { 
            key: 'displayName', 
            title: 'Επωνυμία',
            width: 250 
          },
          { 
            key: 'customerType', 
            title: 'Τύπος',
            width: 150 
          },
          { 
            key: 'afm', 
            title: 'ΑΦΜ',
            width: 100 
          },
          { 
            key: 'email', 
            title: 'Email',
            width: 150 
          },
          { 
            key: 'telephone', 
            title: 'Τηλέφωνο',
            width: 150 
          },
          { 
            key: 'address', 
            title: 'Διεύθυνση',
            width: 200 
          },
          { 
            key: 'createdAt', 
            title: 'Ημερομηνία',
            width: 150 
          },
          { 
            key: 'status', 
            title: 'Κατάσταση',
            width: 100,
            cellRenderer: (cell) => {
              const status = cell.rowData.status;
              const statusClasses = status === 'active' 
                ? 'text-green-400 bg-green-400/10 py-1 px-2 rounded-full text-xs' 
                : 'text-red-400 bg-red-400/10 py-1 px-2 rounded-full text-xs';
              return `<div class="${statusClasses}">${status === 'active' ? 'Ενεργός' : 'Ανενεργός'}</div>`;
            }
          },
          { 
            key: 'offersCount', 
            title: 'Προσφορές',
            width: 100,
            cellRenderer: (cell) => {
              const count = cell.rowData.offersCount || 0;
              if (count === 0) return '<span class="text-gray-400">-</span>';
              return `<div class="text-blue-400 font-medium">${count}</div>`;
            }
          },
          { 
            key: 'actions', 
            title: 'Ενέργειες',
            width: 100,
            cellRenderer: (cell) => {
              const status = cell.rowData.status;
              const statusIcon = status === 'active' ? 'eye' : 'eye-off';
              const statusClass = status === 'active' ? 'text-green-500' : 'text-red-500';
              
              return `<div class="flex items-center justify-end gap-2">
                <button class="action-btn status-btn ${statusClass}" data-customer-id="${cell.rowData.id}" data-action="toggle-status">
                  <i data-lucide="${statusIcon}" class="h-4 w-4"></i>
                </button>
                ${isAdminOrSuperUser ? `
                <button class="action-btn delete-btn text-red-500" data-customer-id="${cell.rowData.id}" data-action="delete">
                  <i data-lucide="trash-2" class="h-4 w-4"></i>
                </button>
                ` : ''}
              </div>`;
            }
          }
        ],
        style: {
          grid: {
            backgroundColor: '#2f3e46',
            color: '#cad2c5',
            border: '1px solid #52796f',
            borderRadius: '0.375rem',
            overflow: 'hidden'
          },
          header: {
            backgroundColor: '#2f3e46',
            color: '#84a98c',
            borderBottom: '1px solid #52796f',
            fontWeight: 'medium',
            fontSize: '0.875rem',
            textAlign: 'center'
          },
          row: {
            borderBottom: '1px solid rgba(82, 121, 111, 0.3)',
            hoverBackgroundColor: '#3d5a5e',
            cursor: 'pointer'
          },
          cell: {
            padding: '8px',
            fontSize: '0.875rem',
            fontWeight: 'normal',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }
        },
        onRowClick: (row) => {
          if (typeof row.id === 'string') {
            navigate(`/customers/${row.id}`);
          }
        },
        onCellClick: (cell, event) => {
          const target = event.target as HTMLElement;
          const actionBtn = target.closest('.action-btn');
          
          if (actionBtn) {
            event.stopPropagation(); // Prevent row click
            const customerId = actionBtn.getAttribute('data-customer-id');
            const action = actionBtn.getAttribute('data-action');
            
            if (customerId && action === 'toggle-status') {
              toggleCustomerStatus(customerId);
            } else if (customerId && action === 'delete' && isAdminOrSuperUser) {
              handleDeleteCustomer(customerId);
            }
          }
        }
      };
      
      const newGridInstance = createGrid(gridOptions);
      setGridInstance(newGridInstance);
    }
  }, [gridRef.current, navigate, isAdminOrSuperUser]);

  // Fetch total count and initial data
  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        // Build count query
        let countQuery = supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null);
        
        // Apply filters
        if (selectedCustomerTypes.length > 0) {
          countQuery = countQuery.in('customer_type', selectedCustomerTypes);
        }
        
        if (statusFilter !== 'all') {
          countQuery = countQuery.eq('status', statusFilter);
        }
        
        if (searchTerm && searchColumn) {
          countQuery = countQuery.ilike(searchColumn, `%${searchTerm}%`);
        }
        
        const { count, error } = await countQuery;
        
        if (error) throw error;
        
        setTotalCount(count || 0);
        
        // Fetch first page of data
        fetchPage(0);
      } catch (error) {
        console.error('Error fetching total count:', error);
        toast({
          title: "Σφάλμα",
          description: "Δεν ήταν δυνατή η φόρτωση του συνολικού αριθμού πελατών.",
          variant: "destructive",
        });
      }
    };
    
    fetchTotalCount();
  }, [debouncedSearchTermRef.current, statusFilter, selectedCustomerTypes.join(',')]);

  // Function to handle debounced search
  useEffect(() => {
    const handleDebouncedSearch = debounce(() => {
      debouncedSearchTermRef.current = searchTerm;
      // Reset page and fetch new data
      if (gridInstance) {
        gridInstance.clearData();
        fetchPage(0);
      }
    }, 300);
    
    handleDebouncedSearch();
    
    return () => {
      handleDebouncedSearch.cancel();
    };
  }, [searchTerm, searchColumn]);
  
  // Function to fetch customer data by page
  const fetchPage = async (pageIndex: number) => {
    setLoading(true);
    
    try {
      // Calculate from/to for pagination
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // Build query
      let query = supabase
        .from('customers')
        .select('*')
        .is('deleted_at', null)
        .range(from, to)
        .order('company_name', { ascending: true });
      
      // Apply customer type filter
      if (selectedCustomerTypes.length > 0) {
        query = query.in('customer_type', selectedCustomerTypes);
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply search filter
      if (searchTerm && searchColumn) {
        query = query.ilike(searchColumn, `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && gridInstance) {
        // Process data with offer counts (in a real implementation, we'd batch this)
        const processedData = await processCustomerData(data);
        
        // Add data to grid
        gridInstance.addData(processedData);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching customers page:', error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των πελατών.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  
  // Process customer data to add offers count and format for grid
  const processCustomerData = async (customers: Customer[]): Promise<CustomerGridRow[]> => {
    // Get customer IDs for batch query
    const customerIds = customers.map(customer => customer.id);
    
    // Fetch offers count in a batch
    let offerCountMap: Record<string, number> = {};
    
    if (customerIds.length > 0) {
      try {
        const { data: offerCounts, error } = await supabase
          .from('offers')
          .select('customer_id, id')
          .in('customer_id', customerIds)
          .is('deleted_at', null);
        
        if (!error && offerCounts) {
          // Group by customer ID
          offerCountMap = offerCounts.reduce((acc, offer) => {
            const customerId = offer.customer_id;
            if (!acc[customerId]) acc[customerId] = 0;
            acc[customerId]++;
            return acc;
          }, {} as Record<string, number>);
        }
      } catch (err) {
        console.error('Error counting offers:', err);
      }
    }
    
    // Format customer data for grid
    return customers.map(customer => {
      // Format customer name (company or first+last)
      const displayName = customer.company_name || 
        (customer.first_name && customer.last_name ? 
          `${customer.first_name} ${customer.last_name}` : "—");
      
      return {
        id: customer.id,
        displayName,
        customerType: customer.customer_type || "—",
        afm: customer.afm || "—",
        email: customer.email || "—",
        telephone: customer.telephone || "—",
        address: customer.address || "—",
        createdAt: customer.created_at ? formatDateTime(customer.created_at) : "—",
        status: customer.status as 'active' | 'inactive',
        offersCount: offerCountMap[customer.id] || 0,
        rawData: customer
      };
    });
  };
  
  // Handle column change
  const handleColumnChange = (column: string) => {
    setSearchColumn(column);
  };
  
  // Handle customer type filter change
  const handleCustomerTypeChange = (types: string[]) => {
    setSelectedCustomerTypes(types);
    if (gridInstance) {
      gridInstance.clearData();
      fetchPage(0);
    }
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    if (statusFilter !== status) {
      setStatusFilter(status);
      if (gridInstance) {
        gridInstance.clearData();
        fetchPage(0);
      }
    }
  };
  
  // Toggle customer status
  const toggleCustomerStatus = async (customerId: string) => {
    try {
      // Find customer in grid data
      const customer = gridInstance?.getRows().find(row => row.id === customerId)?.rawData;
      
      if (!customer) return;
      
      const newStatus = customer.status === 'active' ? 'inactive' : 'active';
      
      // Update in database
      await supabase
        .from('customers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
      
      // Refresh data
      gridInstance?.clearData();
      fetchPage(0);
      
      // Show success message
      toast({
        title: "Επιτυχής ενημέρωση",
        description: newStatus === 'active' 
          ? 'Ο πελάτης ενεργοποιήθηκε με επιτυχία!' 
          : 'Ο πελάτης απενεργοποιήθηκε με επιτυχία!',
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating customer status:", error);
      toast({
        title: "Σφάλμα",
        description: 'Σφάλμα κατά την ενημέρωση της κατάστασης του πελάτη',
        variant: "destructive",
      });
    }
  };
  
  // Handle delete customer
  const handleDeleteCustomer = (customerId: string) => {
    // In a real implementation, show a confirmation dialog
    // and then perform the deletion
    console.log(`Would delete customer ${customerId}`);
    
    toast({
      title: "Λειτουργία σε εξέλιξη",
      description: "Η διαγραφή δεν είναι ενεργή στο demo. Στην πλήρη υλοποίηση θα εμφανιζόταν διάλογος επιβεβαίωσης.",
      variant: "default",
    });
  };
  
  // Customer type filter component
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
            {isFilterActive && <div className="w-4 h-4 flex items-center justify-center text-yellow-300">*</div>}
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
          Διαχείριση Πελατών (Fast-Grid POC)
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/customers")}
            className="bg-transparent hover:bg-[#52796f] text-[#84a98c] hover:text-[#cad2c5] flex items-center gap-2 transition-colors font-normal"
          >
            Επιστροφή στην κανονική προβολή
          </Button>
          <span className="text-[#84a98c] text-sm">— Αυτή είναι μια επίδειξη της Fast-Grid για απόδοση υψηλής ταχύτητας</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="w-1/4">
          {/* Empty space */}
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
          {/* Status filter buttons */}
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

      {/* Grid container */}
      <div 
        ref={containerRef} 
        className="relative" 
        style={{ height: "600px" }}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-[#2f3e46]/75 flex items-center justify-center z-10">
            <LoadingSpinner fullScreen={false} />
            <span className="ml-3 text-[#cad2c5]">Φόρτωση πελατών...</span>
          </div>
        )}
        
        {/* Fast-Grid container */}
        <div 
          ref={gridRef} 
          className="w-full h-full border border-[#52796f] rounded-lg overflow-hidden" 
        />
      </div>
      
      {/* Footer with count information */}
      <div className="mt-4 text-sm text-[#84a98c] text-right">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs text-[#84a98c] italic">
              Fast-Grid: εξαιρετικά γρήγορη απόδοση με μηδενικό frame drop ακόμα και για 100.000+ εγγραφές
            </span>
          </div>
          <div>
            Βρέθηκαν <span className="text-white font-medium">{totalCount}</span> εγγραφές
          </div>
        </div>
      </div>
    </div>
  );
} 