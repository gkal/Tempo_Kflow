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
import { SearchBar } from "@/components/ui/search-bar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define types
interface CustomerOffer {
  id: string;
  name: string;
  value: number;
  date: string;
  status: string;
  requirements?: string;
  result?: string;
}

interface Customer {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  afm?: string;
  telephone?: string;
  email?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  customer_type?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  notes?: string;
  offers_count?: number;
  offersCount?: number;
  isExpanded?: boolean;
  offers?: CustomerOffer[];
  [key: string]: any;
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
  return Array(count).fill(null).map((_, index) => ({
    id: `mock-${index}`,
    company_name: `Test Company ${index}`,
    first_name: `John`,
    last_name: `Doe ${index}`,
    afm: `12345${index}`,
    telephone: `210-1234${index}`,
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
    isExpanded: index % 3 !== 0,
    name: `John Doe ${index}`,
    offersCount: index * 100
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
  const [searchColumn, setSearchColumn] = useState('company_name');

  // Search columns definition
  const searchColumns = [
    { accessor: 'company_name', header: 'Επωνυμία' },
    { accessor: 'first_name', header: 'Όνομα' },
    { accessor: 'last_name', header: 'Επώνυμο' },
    { accessor: 'afm', header: 'ΑΦΜ' },
    { accessor: 'email', header: 'Email' },
    { accessor: 'telephone', header: 'Τηλέφωνο' }
  ];

  // Filter the customers based on search term and active filter
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Filter by status
      if (activeFilter === 'active' && customer.status !== 'active') return false;
      if (activeFilter === 'inactive' && customer.status !== 'inactive') return false;
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const value = customer[searchColumn];
        return value ? String(value).toLowerCase().includes(searchLower) : false;
      }
      
      return true;
    });
  }, [customers, searchTerm, activeFilter, searchColumn]);

  // Column definitions
  const columnHelper = createColumnHelper<Customer>();
  
  const columns = useMemo(() => [
    columnHelper.display({
      id: 'expand',
      header: 'ΠΡ',
      cell: ({ row }) => {
        const customer = row.original;
        const offersCount = customer.offers_count || 0;
        
        // Don't show anything if there are no offers
        if (offersCount === 0) {
          return <div className="w-full h-full"></div>;
        }
        
        return (
          <div 
            className="flex items-center justify-center w-full h-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpandedCustomerId(expandedCustomerId === customer.id ? null : customer.id);
            }}
          >
            <div className="flex items-center justify-center relative group cursor-pointer hover:bg-[#52796f]/60 rounded-full w-10 h-7 transition-colors duration-200">
              <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
              <div className="flex items-center justify-center">
                {expandedCustomerId === customer.id ? (
                  <ChevronDown className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
                )}
                <span className="ml-0.5 text-xs text-[#84a98c] group-hover:text-white relative z-10">{offersCount}</span>
              </div>
            </div>
          </div>
        );
      },
      meta: {
        className: 'w-[30px]'
      },
    }),
    
    columnHelper.accessor('company_name', {
      header: 'Επωνυμία',
      cell: info => {
        const customer = info.row.original;
        // If first_name and last_name exists but not company_name, show them instead
        if ((!info.getValue() || info.getValue() === "") && customer.first_name && customer.last_name) {
          return <span>{customer.first_name} {customer.last_name}</span>;
        }
        return <span>{info.getValue() || "—"}</span>;
      },
      meta: {
        className: 'w-[22%]'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('customer_type', {
      header: 'Τύπος',
      cell: info => info.getValue() || "—",
      meta: {
        className: 'w-[10%]'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('afm', {
      header: 'ΑΦΜ',
      cell: info => info.getValue() || "—",
      meta: {
        className: 'w-[10%]'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('telephone', {
      header: 'Τηλέφωνο',
      cell: info => info.getValue() || "—",
      meta: {
        className: 'w-[10%]'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => info.getValue() || "—",
      meta: {
        className: 'w-[20%]'
      },
      enableSorting: true,
    }),
    
    columnHelper.accessor('status', {
      header: 'Κατάσταση',
      cell: info => {
        const status = info.getValue();
        return (
          <div className="flex justify-end">
            {status === 'active' ? (
              <Eye className="h-5 w-5 text-green-500" />
            ) : (
              <EyeOff className="h-5 w-5 text-red-500" />
            )}
          </div>
        );
      },
      meta: {
        className: 'w-[8%] text-right'
      },
      enableSorting: true,
    }),
  ], [expandedCustomerId]);

  const renderExpandedContent = (customer: Customer) => {
    const offers = customer.offers || [];
    
    return (
      <div className="pl-[70px] pr-4 py-3">
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <LoadingSpinner fullScreen={false} />
          </div>
        ) : offers.length === 0 ? (
          <div className="py-4 text-[#84a98c] flex flex-col items-center justify-center gap-3">
            <div className="text-center">
              Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
            </div>
          </div>
        ) : (
          <div>
            <table className="w-full border-collapse rounded-md overflow-hidden">
              <thead>
                <tr className="bg-[#3a5258] text-[#a8c5b5]">
                  <th className="px-2 py-2 text-left text-xs font-semibold w-[160px]">Ημερομηνία</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Ζήτηση Πελάτη</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Ποσό</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold w-[140px]">Κατάσταση</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold w-[100px]">Αποτέλεσμα</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {offers.slice(0, 20).map((offer) => (
                  <tr 
                    key={offer.id} 
                    className="border-t border-[#52796f]/30 hover:bg-[#354f52]/30 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle offer click
                    }}
                  >
                    <td className="px-2 py-2 text-xs text-[#cad2c5] w-[160px]">
                      {formatDate(offer.date)}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
                      {offer.requirements || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
                      {formatCurrency(offer.value)}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#cad2c5] w-[140px]">
                      {offer.status}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
                      {offer.result || "-"}
                    </td>
                    <td className="px-3 py-2 text-center w-[50px]">
                      {/* Add action buttons if needed */}
                    </td>
                  </tr>
                ))}
                
                {offers.length > 20 && (
                  <tr className="bg-[#354f52]/30">
                    <td colSpan={6} className="px-4 py-2 text-xs text-center text-[#84a98c]">
                      + {offers.length - 20} ακόμα προσφορές...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const handleFilter = (filter: 'all' | 'active' | 'inactive') => {
    setActiveFilter(filter);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleColumnChange = (column: string) => {
    setSearchColumn(column);
  };

  // Create default sort state based on search column
  const initialSortState = useMemo(() => [
    { id: searchColumn, desc: false }
  ], [searchColumn]);

  return (
    <div className="space-y-4">
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
            onColumnChange={setSearchColumn}
          />
        </div>
        
        <div className="flex items-center gap-2 w-1/4 justify-end">
          {/* Status filters styled as in the DataTableBase */}
          <div className="flex items-center gap-2">
            <div 
              onClick={() => handleFilter('all')}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${activeFilter === "all" 
                  ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(59,130,246,0.3)] ring-blue-400/50" 
                  : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
              >
                Όλοι
              </span>
            </div>
            
            <div 
              onClick={() => handleFilter('active')}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${activeFilter === "active" 
                  ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
                  : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
              >
                Ενεργός
              </span>
            </div>
            
            <div 
              onClick={() => handleFilter('inactive')}
              className="relative inline-block min-w-[70px]"
            >
              <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
                ${activeFilter === "inactive" 
                  ? "bg-red-500/20 text-red-400 font-medium shadow-[0_0_8px_2px_rgba(248,113,113,0.3)] ring-red-400/50" 
                  : "bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-transparent"}`}
              >
                Ανενεργός
              </span>
            </div>
          </div>
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