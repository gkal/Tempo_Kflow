import React, { useState, useCallback, useMemo, useEffect } from "react";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Pencil,
  Trash,
  PlusCircle,
  Check,
  X,
  EyeOff,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableWrapper } from "@/components/ui/virtual-table/TableWrapper";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { VirtualTable } from '@/components/ui/virtual-table/VirtualTable';

// Define types
interface CustomerOffer {
  id: string;
  name: string;
  value: number;
  date: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalValue: number;
  isActive: boolean;
  offers?: CustomerOffer[];
}

interface VirtualCustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
  onCustomerClick?: (customer: Customer) => void;
}

interface OffersTableProps {
  offers: CustomerOffer[];
}

// Helper function for formatting currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
};

// Simple component to display offers in expanded rows
const OffersTable: React.FC<OffersTableProps> = ({ offers }) => {
  if (!offers || offers.length === 0) {
    return <div className="py-2 text-[#cad2c5]">Δεν υπάρχουν προσφορές</div>;
  }

  return (
    <div className="p-4 bg-[#354f52] rounded-md my-2">
      <h4 className="text-[#cad2c5] font-medium mb-2">Προσφορές Πελάτη</h4>
      <div className="grid grid-cols-3 gap-4">
        {offers.map((offer, index) => (
          <div key={index} className="bg-[#2f3e46] p-3 rounded-md border border-[#52796f]">
            <div className="text-[#84a98c] text-sm font-medium">{offer.name}</div>
            <div className="text-[#cad2c5] font-bold mt-1">{formatCurrency(offer.value)}</div>
            <div className="text-[#cad2c5]/70 text-xs mt-1">
              {new Date(offer.date).toLocaleDateString('el-GR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function for formatting dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy');
  } catch (error) {
    return '-';
  }
};

// Generate mock data for testing purposes
const generateMockCustomerData = (count: number): Customer[] => {
  console.log(`Generating ${count} mock customers`);
  return Array(count).fill(null).map((_, index) => ({
    id: `mock-${index}`,
    company_name: `Test Company ${index}`,
    first_name: `John`,
    last_name: `Doe ${index}`,
    tax_id: `12345${index}`,
    phone: `210-1234${index}`,
    email: `test${index}@example.com`,
    address: `Fake Street ${index}`,
    postal_code: `1234${index}`,
    city: "Athens",
    customer_type: index % 2 === 0 ? "Εταιρεία" : "Ιδιώτης",
    status: index % 3 === 0 ? "inactive" : "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    notes: `Some notes for customer ${index}`,
    offers_count: index % 5,
    isActive: index % 3 !== 0,
    name: `John Doe ${index}`,
    totalValue: index * 100
  }));
};

const VirtualCustomersTable = ({ 
  customers, 
  isLoading,
  onCustomerClick 
}: VirtualCustomersTableProps) => {
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchColumn, setSearchColumn] = useState<keyof Customer>('name');

  // Calculate total value from offers for each customer
  const customersWithCalculatedValues = useMemo(() => {
    return customers.map(customer => {
      // Calculate total value from offers if available
      if (customer.offers && customer.offers.length > 0 && customer.totalValue === 0) {
        const calculatedTotal = customer.offers.reduce((sum, offer) => sum + (offer.value || 0), 0);
        return {
          ...customer,
          totalValue: calculatedTotal
        };
      }
      return customer;
    });
  }, [customers]);

  // Filter the customers based on search term and active filter
  const filteredCustomers = useMemo(() => {
    return customersWithCalculatedValues.filter(customer => {
      // Filter by status
      if (activeFilter === 'active' && !customer.isActive) return false;
      if (activeFilter === 'inactive' && customer.isActive) return false;
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          String(customer[searchColumn] || '').toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [customersWithCalculatedValues, searchTerm, activeFilter, searchColumn]);

  // Column definitions
  const columnHelper = createColumnHelper<Customer>();
  
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'expander',
      header: '',
      cell: ({ row }) => {
        const customer = row.original;
        const hasOffers = customer.offers && customer.offers.length > 0;
        const offersCount = customer.offers?.length || 0;
        
        return (
          <div 
            className="flex items-center cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedCustomerId(expandedCustomerId === customer.id ? null : customer.id);
            }}
          >
            <div className="group-hover:bg-[#52796f]/30 rounded-full p-1 flex items-center">
              <ChevronRight 
                className={cn(
                  "h-4 w-4 text-[#84a98c] transition-transform duration-200",
                  expandedCustomerId === customer.id && "transform rotate-90"
                )}
              />
              {hasOffers && (
                <span className="text-xs ml-1 text-[#84a98c]">{offersCount}</span>
              )}
            </div>
          </div>
        );
      },
      meta: {
        className: 'w-10'
      },
    }),
    
    columnHelper.accessor('name', {
      header: 'Όνομα Πελάτη',
      cell: info => <div className="font-medium">{info.getValue()}</div>,
      meta: {
        className: 'min-w-[200px]'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => info.getValue(),
      meta: {
        className: 'min-w-[200px]'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('phone', {
      header: 'Τηλέφωνο',
      cell: info => info.getValue(),
      meta: {
        className: 'min-w-[150px]'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('totalValue', {
      header: 'Συνολική Αξία',
      cell: info => formatCurrency(info.getValue()),
      meta: {
        className: 'text-right'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('isActive', {
      header: 'Κατάσταση',
      cell: info => {
        const isActive = info.getValue();
        
        return (
          <div className="flex justify-end">
            {isActive ? (
              <Eye className="h-5 w-5 text-green-500" />
            ) : (
              <EyeOff className="h-5 w-5 text-red-500" />
            )}
          </div>
        );
      },
      meta: {
        className: 'w-20 text-right'
      },
      enableSorting: true,
    }),
  ], [expandedCustomerId]);

  const renderExpandedContent = (customer: Customer) => {
    return <OffersTable offers={customer.offers || []} />;
  };

  const handleFilter = (filter: 'all' | 'active' | 'inactive') => {
    setActiveFilter(filter);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleColumnChange = (column: keyof Customer) => {
    setSearchColumn(column);
  };

  // Create default sort state based on search column
  const initialSortState = useMemo(() => [
    { id: searchColumn, desc: false }
  ], [searchColumn]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="w-full sm:w-64">
          <div className="flex items-center gap-2">
            <select
              value={searchColumn}
              onChange={(e) => handleColumnChange(e.target.value as keyof Customer)}
              className="px-2 py-2 border border-[#52796f] rounded-md bg-[#2f3e46] text-[#cad2c5] focus:outline-none focus:ring-2 focus:ring-[#84a98c] text-sm"
            >
              <option value="name">Όνομα</option>
              <option value="email">Email</option>
              <option value="phone">Τηλέφωνο</option>
            </select>
            <input
              type="text"
              placeholder="Αναζήτηση..."
              className="w-full px-3 py-2 border border-[#52796f] rounded-md bg-[#2f3e46] text-[#cad2c5] placeholder-[#84a98c]/50 focus:outline-none focus:ring-2 focus:ring-[#84a98c]"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeFilter === 'all' 
                ? "bg-[#84a98c] text-[#2f3e46]" 
                : "bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] hover:bg-[#354f52]"
            )}
            onClick={() => handleFilter('all')}
          >
            Όλοι
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeFilter === 'active' 
                ? "bg-[#84a98c] text-[#2f3e46]" 
                : "bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] hover:bg-[#354f52]"
            )}
            onClick={() => handleFilter('active')}
          >
            Ενεργοί
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeFilter === 'inactive' 
                ? "bg-[#84a98c] text-[#2f3e46]" 
                : "bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] hover:bg-[#354f52]"
            )}
            onClick={() => handleFilter('inactive')}
          >
            Ανενεργοί
          </button>
        </div>
      </div>

      <div className="h-[400px] overflow-auto">
        <VirtualTable
          data={filteredCustomers}
          columns={columns}
          isLoading={isLoading}
          renderExpanded={renderExpandedContent}
          isRowExpanded={(id) => id === expandedCustomerId}
          onToggleExpand={(id) => setExpandedCustomerId(expandedCustomerId === id ? null : id)}
          keyExtractor={(customer) => customer.id}
          onRowClick={onCustomerClick}
          enableVirtualization={false}
          initialSortingState={initialSortState}
        />
      </div>
    </div>
  );
};

export default VirtualCustomersTable; 