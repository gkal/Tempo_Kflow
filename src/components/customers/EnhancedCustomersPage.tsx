import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import VirtualCustomersTable from './VirtualCustomersTable';
import { Customer } from '@/types';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/GlobalTooltip';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

// This matches the actual database schema from the existing app
interface DatabaseOffer {
  id: string;
  customer_id: string;
  created_at: string;
  source: string;
  amount: string;  // NOTE: amount is TEXT not number in the database
  customer_comments: string;
  our_comments: string;
  offer_result: string; // This is used for status (wait_for_our_answer, wait_for_customer_answer, ready)
  result: string;  // This is offer_result ENUM: success, failed, cancel, waiting
  assigned_to: string;
  created_by: string;
  updated_at: string;
  deleted_at: string;
  requirements: string;
}

// Helper function to format dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy', { locale: el });
  } catch (error) {
    return '-';
  }
};

// Format functions for display
const formatStatus = (status: string) => {
  switch (status) {
    case "wait_for_our_answer":
      return "Αναμονή για απάντησή μας";
    case "wait_for_customer_answer":
      return "Αναμονή για απάντηση πελάτη";
    case "ready":
      return "Ολοκληρώθηκε";
    default:
      return status;
  }
};

const formatResult = (result: string) => {
  switch (result) {
    case "success":
      return "Επιτυχία";
    case "failed":
      return "Αποτυχία";
    case "cancel":
      return "Ακύρωση";
    case "waiting":
      return "Αναμονή";
    case "none":
      return "Κανένα";
    default:
      return result || "—";
  }
};

// Function to map database customers to the app Customer type
const mapDatabaseCustomers = (dbCustomers: any[]): Customer[] => {
  return dbCustomers.map(dbCustomer => ({
    id: dbCustomer.id,
    name: dbCustomer.company_name || `${dbCustomer.first_name || ''} ${dbCustomer.last_name || ''}` || 'Χωρίς Όνομα',
    email: dbCustomer.email || '',
    phone: dbCustomer.phone || dbCustomer.telephone || '',
    // Parse amount as a number since it's stored as TEXT in database
    totalValue: dbCustomer.offers?.reduce((sum, offer) => {
      const amount = parseFloat(offer.amount) || 0;
      return sum + amount;
    }, 0) || 0,
    isActive: dbCustomer.status === 'active',
    offers: dbCustomer.offers?.map(offer => ({
      id: offer.id,
      name: `Προσφορά ${offer.id.substring(0, 4)}`,
      value: parseFloat(offer.amount) || 0,
      date: offer.created_at,
      status: offer.offer_result || 'pending'
    })) || []
  }));
};

const EnhancedCustomersPage: React.FC = () => {
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState<keyof Customer>('name');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Search columns definition
  const searchColumns = [
    { value: 'name', label: 'Όνομα' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Τηλέφωνο' }
  ];

  // Fetch customers from Supabase
  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const startTime = performance.now();
      
      // Query exactly matches what's in the original CustomerPage
      const { data: dbCustomers, error } = await supabase
        .from('customers')
        .select(`
          id,
          company_name,
          email,
          telephone,
          status,
          created_at,
          offers(
            id,
            customer_id,
            created_at,
            source,
            amount,
            offer_result,
            result,
            customer_comments,
            our_comments,
            deleted_at
          )
        `)
        .is('deleted_at', null)
        .order('company_name', { ascending: true });
        
      if (error) {
        console.error('Error fetching customers:', error);
        setError(`Σφάλμα φόρτωσης πελατών: ${error.message}`);
        return;
      }
      
      // Map the database customers to the application's Customer type
      const mappedCustomers = mapDatabaseCustomers(dbCustomers || []);
      
      // Calculate load time
      const endTime = performance.now();
      setLoadTime(endTime - startTime);
      
      // Log success in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Loaded ${mappedCustomers.length} customers in ${endTime - startTime}ms`);
      }
      
      setCustomers(mappedCustomers);
      setFilteredCustomers(mappedCustomers);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Απρόσμενο σφάλμα: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter customers based on search term and status
  useEffect(() => {
    if (!customers.length) return;

    const filtered = customers.filter(customer => {
      // Filter by status if not 'all'
      if (statusFilter === 'active' && !customer.isActive) return false;
      if (statusFilter === 'inactive' && customer.isActive) return false;
      
      // Filter by search term if provided
      if (searchTerm) {
        const fieldValue = String(customer[searchColumn] || '').toLowerCase();
        return fieldValue.includes(searchTerm.toLowerCase());
      }
      
      return true;
    });

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, searchColumn, statusFilter]);

  // Handle customer click
  const handleCustomerClick = (customer: Customer) => {
    console.log('Customer clicked:', customer);
    // Add navigation or other handling here
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Handle search column change
  const handleSearchColumnChange = (column: keyof Customer) => {
    setSearchColumn(column);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status);
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-[#2f3e46] rounded-lg p-6 shadow-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">Πελάτες</h1>
            {loadTime && !isLoading && (
              <div className="text-sm text-[#84a98c] mb-2">
                Φορτώθηκαν {customers.length} πελάτες σε {loadTime.toFixed(2)}ms
              </div>
            )}
            
            {/* Search and filter controls */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="w-full sm:w-64">
                <div className="flex items-center gap-2">
                  <select
                    value={searchColumn}
                    onChange={(e) => handleSearchColumnChange(e.target.value as keyof Customer)}
                    className="px-2 py-2 border border-[#52796f] rounded-md bg-[#2f3e46] text-[#cad2c5] focus:outline-none focus:ring-2 focus:ring-[#84a98c] text-sm"
                  >
                    {searchColumns.map(column => (
                      <option key={column.value} value={column.value}>{column.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Αναζήτηση..."
                    className="w-full px-3 py-2 border border-[#52796f] rounded-md bg-[#2f3e46] text-[#cad2c5] placeholder-[#84a98c]/50 focus:outline-none focus:ring-2 focus:ring-[#84a98c]"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === 'all' 
                      ? "bg-[#84a98c] text-[#2f3e46]" 
                      : "bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] hover:bg-[#354f52]"
                  }`}
                  onClick={() => handleStatusFilterChange('all')}
                >
                  Όλοι
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === 'active' 
                      ? "bg-[#84a98c] text-[#2f3e46]" 
                      : "bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] hover:bg-[#354f52]"
                  }`}
                  onClick={() => handleStatusFilterChange('active')}
                >
                  Ενεργοί
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === 'inactive' 
                      ? "bg-[#84a98c] text-[#2f3e46]" 
                      : "bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] hover:bg-[#354f52]"
                  }`}
                  onClick={() => handleStatusFilterChange('inactive')}
                >
                  Ανενεργοί
                </button>
              </div>
            </div>
          </div>
        
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-6 w-6 text-[#84a98c] animate-spin mr-2" />
              <span className="text-[#cad2c5]">Φόρτωση πελατών...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64 text-red-500">
              <p>{error}</p>
            </div>
          ) : (
            <VirtualCustomersTable 
              customers={filteredCustomers}
              isLoading={isLoading}
              onCustomerClick={handleCustomerClick}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EnhancedCustomersPage; 