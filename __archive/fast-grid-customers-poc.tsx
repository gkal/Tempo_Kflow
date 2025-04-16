import React, { useEffect, useState } from 'react';
import { createGrid, GridCell } from 'fast-grid';
import { supabase } from '@/lib/supabaseClient';

// Types for our data
interface Customer {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  customer_type?: string;
  status: string;
  email?: string;
  telephone?: string;
  address?: string;
  created_at: string;
  afm?: string;
}

interface CustomerGridRow {
  id: string;
  displayName: string;
  customerType: string;
  afm: string;
  email: string;
  telephone: string;
  address: string;
  createdAt: string;
  status: string;
  offersCount: number;
}

// Format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

// Pagination params
const PAGE_SIZE = 50;

const CustomersGrid = () => {
  const [gridRef, setGridRef] = useState<HTMLDivElement | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [grid, setGrid] = useState<any>(null);

  // Create the grid when the container ref is available
  useEffect(() => {
    if (!gridRef) return;

    const newGrid = createGrid({
      element: gridRef,
      // Define column structure
      columns: [
        { id: 'displayName', title: 'Επωνυμία', width: 250 },
        { id: 'customerType', title: 'Τύπος', width: 150 },
        { id: 'afm', title: 'ΑΦΜ', width: 100 },
        { id: 'email', title: 'Email', width: 150 },
        { id: 'telephone', title: 'Τηλέφωνο', width: 150 },
        { id: 'address', title: 'Διεύθυνση', width: 200 },
        { id: 'createdAt', title: 'Ημερομηνία', width: 150 },
        { id: 'status', title: 'Κατάσταση', width: 100 },
        { id: 'offersCount', title: 'Προσφορές', width: 100 },
      ],
      // Set height for virtualization
      height: 600,
      // Configure cell rendering
      cellRenderer: (cell: GridCell) => {
        const { column, row, value } = cell;
        
        // Status cell with colors
        if (column.id === 'status') {
          const statusClass = value === 'active' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400';
          
          return {
            value: value === 'active' ? 'Ενεργός' : 'Ανενεργός',
            className: `px-2 py-1 rounded-full ${statusClass} text-center`,
          };
        }
        
        // Offers count with badge
        if (column.id === 'offersCount') {
          return {
            value: value || '0',
            className: parseInt(value) > 0 
              ? 'font-medium text-blue-400' 
              : 'text-gray-400',
          };
        }
        
        return { value: value ?? '-' };
      },
      // Custom row click handler
      onRowClick: (rowData) => {
        // Navigate to customer detail
        window.location.href = `/customers/${rowData.id}`;
      }
    });
    
    setGrid(newGrid);
    
    // Clean up on unmount
    return () => {
      newGrid.destroy();
    };
  }, [gridRef]);

  // Fetch total count and first page of data on mount
  useEffect(() => {
    if (!grid) return;
    
    const fetchTotalCount = async () => {
      try {
        let query = supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .filter('deleted_at', 'is', null);
        
        // Apply status filter
        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        
        // Apply customer type filter
        if (customerTypes.length > 0) {
          query = query.in('customer_type', customerTypes);
        }
        
        // Apply search filter
        if (searchTerm) {
          query = query.ilike('company_name', `%${searchTerm}%`);
        }
        
        const { count, error } = await query;
        
        if (error) throw error;
        
        setTotalCount(count || 0);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching customer count:', err);
        setIsLoading(false);
      }
    };
    
    fetchTotalCount();
    fetchPage(0);
  }, [grid, searchTerm, statusFilter, customerTypes]);

  // Function to fetch a specific page of data
  const fetchPage = async (pageIndex: number) => {
    if (!grid) return;
    
    setIsLoading(true);
    
    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      // Build the query with filters
      let query = supabase
        .from('customers')
        .select('*, primary_contact_id')
        .filter('deleted_at', 'is', null)
        .range(from, to);
      
      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply customer type filter
      if (customerTypes.length > 0) {
        query = query.in('customer_type', customerTypes);
      }
      
      // Apply search filter
      if (searchTerm) {
        query = query.ilike('company_name', `%${searchTerm}%`);
      }
      
      // Execute the query
      const { data, error } = await query.order('company_name');
      
      if (error) throw error;
      
      const customers = data || [];
      
      // Get customer IDs for offer count lookup
      const customerIds = customers.map(c => c.id);
      
      // Fetch offer counts if we have customers
      let offerCounts: Record<string, number> = {};
      
      if (customerIds.length > 0) {
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .select('customer_id, id')
          .in('customer_id', customerIds)
          .is('deleted_at', null);
        
        if (!offerError && offerData) {
          // Group by customer_id and count
          offerCounts = offerData.reduce((acc, offer) => {
            const id = offer.customer_id;
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }
      
      // Transform for grid display
      const gridRows = customers.map((customer: Customer): CustomerGridRow => ({
        id: customer.id,
        displayName: customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`,
        customerType: customer.customer_type || '-',
        afm: customer.afm || '-',
        email: customer.email || '-',
        telephone: customer.telephone || '-',
        address: customer.address || '-',
        createdAt: customer.created_at ? formatDate(customer.created_at) : '-',
        status: customer.status,
        offersCount: offerCounts[customer.id] || 0
      }));
      
      // Update the grid data
      // Fast-Grid has a very efficient update mechanism
      grid.setData(gridRows);
      
      // Optional: Preload next page for instant responsiveness
      if (pageIndex < Math.ceil(totalCount / PAGE_SIZE) - 1) {
        setTimeout(() => {
          fetchPage(pageIndex + 1);
        }, 500);
      }
      
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
  };

  const handleCustomerTypeChange = (types: string[]) => {
    setCustomerTypes(types);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">Διαχείριση Πελατών</h1>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Search input */}
          <input
            type="text"
            placeholder="Αναζήτηση..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="px-3 py-2 bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] rounded-md focus:outline-none focus:ring-2 focus:ring-[#52796f]"
          />
          
          {/* Status filter buttons */}
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 rounded-md ${statusFilter === 'all' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#2f3e46] text-[#cad2c5]'}`}
              onClick={() => handleStatusFilterChange('all')}
            >
              Όλοι
            </button>
            <button
              className={`px-3 py-2 rounded-md ${statusFilter === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-[#2f3e46] text-[#cad2c5]'}`}
              onClick={() => handleStatusFilterChange('active')}
            >
              Ενεργοί
            </button>
            <button
              className={`px-3 py-2 rounded-md ${statusFilter === 'inactive' ? 'bg-red-500/20 text-red-400' : 'bg-[#2f3e46] text-[#cad2c5]'}`}
              onClick={() => handleStatusFilterChange('inactive')}
            >
              Ανενεργοί
            </button>
          </div>
        </div>
      </div>
      
      {/* Grid container with ref */}
      <div 
        ref={setGridRef} 
        className="w-full h-[600px] bg-[#2f3e46] rounded-lg border border-[#52796f]"
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="p-4 bg-[#2f3e46] rounded-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-t-transparent border-[#52796f] rounded-full animate-spin" />
            <span className="text-[#cad2c5]">Φόρτωση...</span>
          </div>
        </div>
      )}
      
      {/* Pagination indicators */}
      <div className="mt-4 text-sm text-[#84a98c] flex justify-between items-center">
        <span>
          Σύνολο: <span className="text-white font-medium">{totalCount}</span> πελάτες
        </span>
        
        <div className="flex gap-2">
          <span>Σελίδα μεγέθους: </span>
          <select 
            value={PAGE_SIZE} 
            onChange={(e) => {
              // In a real implementation, this would update the PAGE_SIZE constant
              console.log('New page size:', e.target.value);
            }}
            className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] rounded"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default CustomersGrid; 