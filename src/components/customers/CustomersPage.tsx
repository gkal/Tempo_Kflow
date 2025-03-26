import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2, ArrowLeft, Edit, Filter, EyeOff, ChevronRight, ChevronDown, Check } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { DataTableWrapper } from '../DataTableWrapper';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/utils/formatUtils";
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
  GlobalTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/GlobalTooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { CustomerContextMenu } from "./CustomerContextMenu";
import React from "react";
import { CustomerDialog } from "./CustomerDialog";
import { openNewOfferDialog, openEditOfferDialog } from './OfferDialogManager';
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";

// Customer type filter component
interface CustomerTypeFilterProps {
  availableTypes: string[];
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

// These must match exactly what's allowed in the database
const customerTypeOptions = ["Εταιρεία", "Ιδιώτης", "Δημόσιο", "Οικοδομές", "Εκτακτος Πελάτης", "Εκτακτη Εταιρία"];

const CustomerTypeFilter: React.FC<CustomerTypeFilterProps> = ({ 
  availableTypes, 
  selectedTypes, 
  onChange 
}) => {
  const allSelected = selectedTypes.length === 0;
  const [isOpen, setIsOpen] = useState(false);
  
  const handleToggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      // If already selected, remove it
      onChange(selectedTypes.filter(t => t !== type));
    } else {
      // If not selected, add it
      onChange([...selectedTypes, type]);
    }
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
              ? 'bg-[#52796f] text-white border-0 shadow-[0_0_35px_8px_rgba(82,121,111,0.95)] filter-glow-extreme scale-105' 
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
        style={{ boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div 
          className="bg-[#2f3e46] text-[#cad2c5]"
          style={{ padding: "0", margin: "0" }}
        >
          <button
            className="w-full text-left bg-[#2f3e46] text-[#cad2c5] hover:bg-[#354f52] transition-colors duration-150 px-3 py-2 flex items-center gap-2 cursor-pointer"
            onClick={handleSelectAll}
            style={{ border: "none", outline: "none" }}
          >
            {allSelected ? (
              <Check className="h-4 w-4 mr-2 text-[#84a98c]" />
            ) : (
              <div className="w-4 h-4 mr-2" />
            )}
            <span className="text-sm">Όλοι οι τύποι</span>
          </button>
          
          <div className="h-px bg-[#52796f]/30 mx-3 my-1" style={{ margin: "4px 12px" }}></div>
          
          {customerTypeOptions.map((type) => (
            <button
              key={type}
              className="w-full text-left bg-[#2f3e46] text-[#cad2c5] hover:bg-[#354f52] transition-colors duration-150 px-3 py-2 flex items-center gap-2 cursor-pointer"
              onClick={() => handleToggleType(type)}
              style={{ border: "none", outline: "none" }}
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

// Add custom animation style at the top of the file
const progressAnimationStyle = {
  "@keyframes progress": {
    "0%": { transform: "translateX(-100%)" },
    "50%": { transform: "translateX(0%)" },
    "100%": { transform: "translateX(100%)" }
  },
  ".animate-progress": {
    animation: "progress 1.5s ease-in-out infinite"
  },
  ".custom-scrollbar": {
    scrollbarWidth: "thin",
    scrollbarColor: "#52796f #2f3e46"
  },
  ".custom-scrollbar::-webkit-scrollbar": {
    width: "6px"
  },
  ".custom-scrollbar::-webkit-scrollbar-track": {
    background: "#2f3e46"
  },
  ".custom-scrollbar::-webkit-scrollbar-thumb": {
    backgroundColor: "#52796f",
    borderRadius: "20px"
  },
  ".custom-scrollbar::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "#84a98c"
  },
  "@keyframes filterGlow": {
    "0%": { boxShadow: "0 0 15px rgba(82,121,111,0.7)" },
    "50%": { boxShadow: "0 0 25px rgba(82,121,111,0.9)" },
    "100%": { boxShadow: "0 0 15px rgba(82,121,111,0.7)" }
  },
  ".filter-glow": {
    animation: "filterGlow 1.5s ease-in-out infinite"
  },
  "@keyframes filterGlowExtreme": {
    "0%": { boxShadow: "0 0 20px 3px rgba(82,121,111,0.8)" },
    "25%": { boxShadow: "0 0 35px 8px rgba(82,121,111,0.95)" },
    "50%": { boxShadow: "0 0 45px 12px rgba(132,169,140,0.9)" },
    "75%": { boxShadow: "0 0 35px 8px rgba(82,121,111,0.95)" },
    "100%": { boxShadow: "0 0 20px 3px rgba(82,121,111,0.8)" }
  },
  ".filter-glow-extreme": {
    animation: "filterGlowExtreme 2s ease-in-out infinite"
  }
}

// Add Customer interface
interface Customer {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  status: string;
  offers_count?: number;
  [key: string]: any;
  offers?: any[]; // Add offers array to store customer offers
  isExpanded?: boolean; // Track expanded state
  offersCount?: number; // Add offersCount property
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

// Define the props interface for CustomerRow
interface CustomerRowProps {
  row: any;
  index: number;
  defaultRow: React.ReactElement;
  isExpanded: boolean;
  offers: any[];
  isLoading: boolean;
  columns: any[];
  isAdminOrSuperUser: boolean;
  formatDateTime: (date: string) => string;
  formatSource: (source: string) => string;
  formatStatus: (status: string) => string;
  formatResult: (result: string) => string;
  handleEditOffer: (customerId: string, offerId: string) => void;
  handleDeleteOffer: (customerId: string, offerId: string) => void;
  onCreateOffer: (customerId: string, source: string) => void;
}

// Create a memoized row component to prevent unnecessary re-renders
const CustomerRow = React.memo(({ 
  row, 
  index, 
  defaultRow, 
  isExpanded, 
  offers, 
  isLoading, 
  columns, 
  isAdminOrSuperUser, 
  formatDateTime, 
  formatSource, 
  formatStatus, 
  formatResult, 
  handleEditOffer, 
  handleDeleteOffer, 
  onCreateOffer
}: CustomerRowProps) => {
  // Safety check - if row is undefined, return the default row
  if (!row || !defaultRow) {
    return defaultRow || null;
  }
  
  // Ensure the row has the data-customer-id attribute
  const rowWithDataAttr = React.cloneElement(defaultRow, {
    'data-customer-id': row.id
  });
  
  // Create the expanded row with the same data-customer-id attribute
  const expandedRow = isExpanded ? (
    <tr className="bg-[#2f3e46] border-t border-b border-[#52796f]" data-customer-id={row.id}>
      <td colSpan={columns.length}>
        <div className="pl-[70px]">
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
              <div className="mb-2 pr-4">
                {/* Removed the title "Προσφορές" and the "Νέα Προσφορά" button */}
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#3a5258] text-[#a8c5b5]">
                    <th className="px-2 py-2 text-left text-xs font-medium w-[160px]">Ημερομηνία</th>
                    <th className="px-3 py-2 text-left text-xs font-medium w-[100px]">Ζήτηση Πελάτη</th>
                    <th className="px-3 py-2 text-left text-xs font-medium w-[100px]">Ποσό</th>
                    <th className="px-3 py-2 text-left text-xs font-medium w-[140px]">Κατάσταση</th>
                    <th className="px-3 py-2 text-left text-xs font-medium w-[100px]">Αποτέλεσμα</th>
                    <th className="px-3 py-2 text-center text-xs font-medium w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr 
                      key={offer.id} 
                      className={`
                        border-t border-[#52796f]/30 
                        bg-[#2f3e46]
                        hover:bg-[#354f52] cursor-pointer
                        transition-colors duration-150
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditOffer(row.id, offer.id);
                      }}
                    >
                      <td className="px-2 py-2 text-xs text-[#cad2c5] w-[160px]">{formatDateTime(offer.created_at)}</td>
                      <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
                        {offer.requirements 
                          ? <TruncateWithTooltip 
                              text={offer.requirements} 
                              maxLength={50} 
                              maxWidth={800}
                              multiLine={false}
                              maxLines={2}
                            /> 
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-[#cad2c5] w-[100px]">
                        {offer.amount 
                          ? <TruncateWithTooltip 
                              text={offer.amount} 
                              maxLength={50} 
                              maxWidth={800}
                              multiLine={false}
                              maxLines={2}
                            /> 
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs w-[140px]">
                        <span className={`
                          ${offer.offer_result === "wait_for_our_answer" ? "text-yellow-400" : 
                            offer.offer_result === "wait_for_customer_answer" ? "text-blue-400" : 
                            offer.offer_result === "ready" ? "text-green-400" : "text-gray-400"}
                        `}>
                          {formatStatus(offer.offer_result)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs w-[100px]">
                        <span className={`
                          ${offer.result === "success" ? "text-green-400" : 
                            offer.result === "failed" ? "text-red-400" : 
                            offer.result === "cancel" ? "text-yellow-400" :
                            offer.result === "waiting" ? "text-purple-400" : "text-gray-400"}
                        `}>
                          {formatResult(offer.result)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-center w-[50px]">
                        {isAdminOrSuperUser && (
                          <GlobalTooltip content="Διαγραφή προσφοράς">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOffer(row.id, offer.id);
                              }}
                              className="h-6 w-6 hover:bg-[#354f52] text-red-500 hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </GlobalTooltip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  ) : null;
  
  return (
    <>
      {rowWithDataAttr}
      {expandedRow}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if these specific props change
  return (
    prevProps.row?.id === nextProps.row?.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.offers === nextProps.offers &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.row?.offersCount === nextProps.row?.offersCount
  );
});

// Ensure CustomerRow has a display name for better debugging
CustomerRow.displayName = 'CustomerRow';

// Define the props interface directly in this file
interface OffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: () => void;
  defaultSource?: string;
}

// Add this useDebounce hook if it doesn't exist
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Add a performance measurement utility for diagnostics
const measurePerformance = (label: string, startTime: number): string => {
  const endTime = performance.now();
  const duration = endTime - startTime;
  return `${label}: ${duration.toFixed(2)}ms`;
};

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Apply custom animation styles
  React.useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes progress {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(0%); }
        100% { transform: translateX(100%); }
      }
      .animate-progress {
        animation: progress 1.5s ease-in-out infinite;
      }
      
      @keyframes modalAppear {
        0% { opacity: 0; transform: translateY(10px) scale(0.97); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .modal-appear {
        animation: modalAppear 0.2s ease-out forwards;
      }
      
      @keyframes filterGlow {
        0% { box-shadow: 0 0 15px rgba(82,121,111,0.7); }
        50% { box-shadow: 0 0 25px rgba(82,121,111,0.9); }
        100% { box-shadow: 0 0 15px rgba(82,121,111,0.7); }
      }
      .filter-glow {
        animation: filterGlow 1.5s ease-in-out infinite;
      }
      
      @keyframes filterGlowExtreme {
        0% { box-shadow: 0 0 20px 3px rgba(82,121,111,0.8); }
        25% { box-shadow: 0 0 35px 8px rgba(82,121,111,0.95); }
        50% { box-shadow: 0 0 45px 12px rgba(132,169,140,0.9); }
        75% { box-shadow: 0 0 35px 8px rgba(82,121,111,0.95); }
        100% { box-shadow: 0 0 20px 3px rgba(82,121,111,0.8); }
      }
      .filter-glow-extreme {
        animation: filterGlowExtreme 2s ease-in-out infinite;
      }
      
      /* Custom scrollbar styles */
      .custom-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #52796f #2f3e46;
      }
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #2f3e46;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #52796f;
        border-radius: 20px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: #84a98c;
      }
    `;
    
    // Add it to the document head
    document.head.appendChild(styleElement);
    
    // Clean up when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Simple alert state
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  
  // Track deletion in progress with this ref
  const deletionInProgressRef = useRef<boolean>(false);
  // Track debounce timer for success callback
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add this state to explicitly control dialog visibility
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Define searchColumns here, before it's used in any hooks
  const searchColumns = [
    { header: "Επωνυμία", accessor: "company_name" },
    { header: "Τύπος", accessor: "customer_type" },
    { header: "ΑΦΜ", accessor: "afm" },
    { header: "Email", accessor: "email" },
    { header: "Τηλέφωνο", accessor: "telephone" },
    { header: "Διεύθυνση", accessor: "address" },
  ];
  
  // Add this useEffect inside the component function
  useEffect(() => {
    // Suppress specific accessibility warnings
    const originalConsoleWarn = console.warn;
    console.warn = function(message, ...args) {
      if (typeof message === 'string' && (
        message.includes('Missing `Description` or `aria-describedby`') ||
        message.includes('aria-describedby={undefined}')
      )) {
        // Suppress these specific warnings
        return;
      }
      originalConsoleWarn.apply(console, [message, ...args]);
    };

    return () => {
      console.warn = originalConsoleWarn; // Restore original console.warn on unmount
    };
  }, []);
  
  // Make role check case-insensitive
  const isAdminUser = user?.role?.toLowerCase() === 'admin';
  const isAdminOrSuperUser = isAdminUser || 
                            user?.role === 'Super User' ||
                            user?.role?.toLowerCase() === 'super user';
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchColumn, setSearchColumn] = useState("company_name");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusFilter, setStatusFilter] = useState("active"); // "active", "inactive", "all"
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [lastUpdatedCustomerId, setLastUpdatedCustomerId] = useState<string | null>(null);
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [customerOffers, setCustomerOffers] = useState<Record<string, any[]>>({});
  const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});
  const [showDeleteOfferDialog, setShowDeleteOfferDialog] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<{ customerId: string, offerId: string } | null>(null);
  
  // Customer type filter states
  const [availableCustomerTypes, setAvailableCustomerTypes] = useState<string[]>(customerTypeOptions);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  const debouncedCustomerTypes = useDebounce(selectedCustomerTypes, 300);

  // State to track if the dialog is ready to be shown
  const [isDialogReady, setIsDialogReady] = useState(false);
  
  // State to store the loaded component
  const [OffersDialogComponent, setOffersDialogComponent] = useState<React.ComponentType<any> | null>(null);
  
  // Add a ref to track if we're already showing a dialog
  const dialogActiveRef = useRef<boolean>(false);
  
  // Add a new ref to track the scroll position
  const scrollPositionRef = useRef<number>(0);
  
  // Add these near the top of the component with other state declarations
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Add these near the top of the component with other state declarations
  const [realtimeEnabled, setRealtimeEnabled] = useState<boolean>(true);
  
  // Add this to the component's state declarations
  const [queryTime, setQueryTime] = useState<string>('');
  
  // Add these refs near other refs at the top of the component
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdCounter = useRef<number>(0);
  const lastRequestIdRef = useRef<number>(0);
  const fetchThrottleRef = useRef<boolean>(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Move debouncedSearchTerm declaration before the fetchCustomers function
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Add these new state variables at the top of the component
  const [sortColumn, setSortColumn] = useState<string>("company_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [columnWidths, setColumnWidths] = useState<Record<string, string>>({});
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeColumnId, setResizeColumnId] = useState<string | null>(null);
  const [startX, setStartX] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(0);
  
  // Add these functions to handle sorting and column resizing
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const startResize = (e: React.MouseEvent, columnId: string, currentWidth: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeColumnId(columnId);
    setStartX(e.clientX);
    
    // Parse the width properly, regardless of px suffix
    let numWidth = 100;
    if (typeof currentWidth === 'string') {
      numWidth = parseInt(currentWidth.replace(/px$/, ''), 10);
      if (isNaN(numWidth)) numWidth = 100;
    } else if (typeof currentWidth === 'number') {
      numWidth = currentWidth;
    }
    
    setStartWidth(numWidth);
    
    // Add event listeners to document to catch all mouse events
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    
    // Set cursor for entire document during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const resize = (e: MouseEvent) => {
    if (!isResizing || !resizeColumnId) return;
    
    // Calculate new width with minimum size constraint
    const width = Math.max(50, startWidth + (e.clientX - startX));
    
    // Update columnWidths state with the new width
    setColumnWidths(prev => ({
      ...prev,
      [resizeColumnId]: `${width}px`
    }));
  };

  const stopResize = () => {
    setIsResizing(false);
    setResizeColumnId(null);
    
    // Clean up event listeners
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    
    // Reset cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // Add a memoized sorted customers array
  const sortedCustomers = useMemo(() => {
    if (!sortColumn) return filteredCustomers;
    
    return [...filteredCustomers].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      // Handle special case for created_at to ensure proper date comparison
      if (sortColumn === 'created_at') {
        const aDate = new Date(aValue).getTime();
        const bDate = new Date(bValue).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      
      // Handle null or undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return sortDirection === 'asc' ? 1 : -1;
      
      // Compare strings in a case-insensitive manner
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue, 'el')
          : bValue.localeCompare(aValue, 'el');
      }
      
      // Basic comparison for other types
      return sortDirection === 'asc'
        ? aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        : aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });
  }, [filteredCustomers, sortColumn, sortDirection]);
  
  // Add a function to set up real-time subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!realtimeEnabled) return;
    
    // Subscribe to changes in the offers table
    const offersSubscription = supabase
      .channel('offers-changes')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'offers'
      }, (payload) => {
        // Handle different types of changes
        if (payload.eventType === 'INSERT') {
          // A new offer was created
          const newOffer = payload.new;
          if (newOffer.customer_id) {
            // Refresh offers for this customer if it's expanded
            if (expandedCustomers[newOffer.customer_id]) {
              fetchCustomerOffers(newOffer.customer_id, true);
            }
            
            // Update the offers count for this customer
            updateCustomerOffersCount(newOffer.customer_id);
          }
        } else if (payload.eventType === 'UPDATE') {
          // An offer was updated
          const updatedOffer = payload.new;
          if (updatedOffer.customer_id) {
            // Refresh offers for this customer if it's expanded
            if (expandedCustomers[updatedOffer.customer_id]) {
              fetchCustomerOffers(updatedOffer.customer_id, true);
            }
          }
        } else if (payload.eventType === 'DELETE') {
          // An offer was deleted
          const deletedOffer = payload.old;
          if (deletedOffer.customer_id) {
            // Refresh offers for this customer if it's expanded
            if (expandedCustomers[deletedOffer.customer_id]) {
              fetchCustomerOffers(deletedOffer.customer_id, true);
            }
            
            // Update the offers count for this customer
            updateCustomerOffersCount(deletedOffer.customer_id);
          }
        }
      })
      .subscribe();
    
    // Subscribe to changes in the customers table
    const customersSubscription = supabase
      .channel('customers-changes')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'customers'
      }, (payload) => {
        // Handle different types of changes
        if (payload.eventType === 'UPDATE') {
          // A customer was updated
          const updatedCustomer = payload.new;
          
          // Update the customer in our local state
          setCustomers(prev => 
            prev.map(customer => 
              customer.id === updatedCustomer.id 
                ? { ...customer, ...updatedCustomer, isExpanded: customer.isExpanded } 
                : customer
            )
          );
          
          setFilteredCustomers(prev => 
            prev.map(customer => 
              customer.id === updatedCustomer.id 
                ? { ...customer, ...updatedCustomer, isExpanded: customer.isExpanded } 
                : customer
            )
          );
          
          // Highlight the updated customer
          setLastUpdatedCustomerId(updatedCustomer.id);
          
          // Clear the highlight after 2 seconds
          setTimeout(() => {
            setLastUpdatedCustomerId(null);
          }, 2000);
        } else if (payload.eventType === 'INSERT') {
          // A new customer was created
          fetchCustomers();
        } else if (payload.eventType === 'DELETE') {
          // A customer was deleted
          const deletedCustomer = payload.old;
          
          // Remove the customer from our local state
          setCustomers(prev => 
            prev.filter(customer => customer.id !== deletedCustomer.id)
          );
          
          setFilteredCustomers(prev => 
            prev.filter(customer => customer.id !== deletedCustomer.id)
          );
        }
      })
      .subscribe();
    
    // Return a cleanup function to unsubscribe when component unmounts
    return () => {
      supabase.removeChannel(offersSubscription);
      supabase.removeChannel(customersSubscription);
    };
  }, [expandedCustomers, realtimeEnabled]);
  
  // Add a function to update customer offers count
  const updateCustomerOffersCount = useCallback(async (customerId) => {
    try {
      // Get the count of active offers for this customer
      const { data, error } = await supabase
        .from("offers")
        .select("id")
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .or('result.is.null,result.eq.pending,result.eq.,result.eq.none');
      
      if (error) throw error;
      
      const offersCount = data?.length || 0;
      
      // Update the customer in our local state
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
      
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
    } catch (error) {
      console.error("Error updating customer offers count:", error);
    }
  }, []);
  
  // Set up real-time subscriptions when component mounts
  useEffect(() => {
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [setupRealtimeSubscriptions]);

  // Update the fetchCustomerOffers function to be more efficient with better caching
  const fetchCustomerOffers = useCallback(async (customerId: string, forceRefresh = false) => {
    try {
      // Only use cache if we have data and don't need a force refresh
      if (!forceRefresh && customerOffers[customerId]) {
        return;
      }

      // Use a debounced loading state to prevent flickering for fast loads
      const loadingTimerId = setTimeout(() => {
        setLoadingOffers(prev => ({ ...prev, [customerId]: true }));
      }, 150); // Only show loading indicator if it takes more than 150ms
      
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          created_at,
          requirements,
          amount,
          offer_result,
          result,
          assigned_user:users!assigned_to(fullname),
          created_user:users!created_by(fullname),
          contact:contacts(full_name, position)
        `)
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .or('result.is.null,result.eq.pending,result.eq.,result.eq.none')
        .order("created_at", { ascending: false });
      
      // Clear the timeout to prevent the loading indicator if the request was fast
      clearTimeout(loadingTimerId);
      
      if (error) throw error;
      
      setCustomerOffers(prev => ({
        ...prev,
        [customerId]: data || []
      }));
      
      const offersCount = data?.length || 0;
      
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
      
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, offersCount } 
            : customer
        )
      );
    } catch (error) {
      console.error("Error fetching offers for customer:", error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των προσφορών.",
        variant: "destructive",
      });
    } finally {
      setLoadingOffers(prev => ({ ...prev, [customerId]: false }));
    }
  }, [customerOffers]);
  
  // Update fetchCustomers to be more efficient and prevent double rendering
  const fetchCustomers = useCallback(async () => {
    try {
      const startTime = performance.now();
      console.log('🔍 Starting customer fetch...');
      setLoading(true);
      
      // Simply fetch without using request ID tracking that's causing issues
      
      // Build the initial query
      let query = supabase
        .from('customers')
        .select('*, primary_contact_id')
        .filter('deleted_at', 'is', null);
      
      // Apply customer type filter if any are selected
      if (selectedCustomerTypes.length > 0 && selectedCustomerTypes.length < availableCustomerTypes.length) {
        query = query.in('customer_type', selectedCustomerTypes);
      }
      
      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply search filter if searchTerm exists
      if (searchTerm && searchColumn) {
        query = query.ilike(searchColumn, `%${searchTerm}%`);
      }
      
      // Execute the query
      const response = await query.order('company_name');
      console.log('📊 Query response:', response);
      
      if (response.error) {
        throw response.error;
      }
      
      // Process data
      const responseData = response.data || [];
      console.log(`📋 Found ${responseData.length} customers`);
      
      // Fetch offer counts for all customers
      const customerIds = responseData.map(customer => customer.id);
      
      // Fetch offer counts in a single query
      const { data: offerCountsData, error: offerCountsError } = await supabase
        .from('offers')
        .select('customer_id, id')
        .in('customer_id', customerIds)
        .is('deleted_at', null)
        .or('result.is.null,result.eq.pending,result.eq.,result.eq.none');
      
      if (offerCountsError) {
        console.error('Error fetching offer counts:', offerCountsError);
      } else {
        // Create a map of customer IDs to offer counts
        const offerCountMap = {};
        offerCountsData.forEach(offer => {
          if (!offerCountMap[offer.customer_id]) {
            offerCountMap[offer.customer_id] = 0;
          }
          offerCountMap[offer.customer_id]++;
        });
        
        // Add offer counts to customers
        responseData.forEach(customer => {
          (customer as any).offersCount = offerCountMap[customer.id] || 0;
        });
      }
      
      // Update state
      setCustomers(responseData);
      setFilteredCustomers(responseData);
      setTotalCount(responseData.length);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`⏱️ ${measurePerformance('Customer fetch', startTime)}`);
      console.log('✅ Customer rendering complete: ' + responseData.length + ' customers ready to display');
      
      // Immediately set loading to false
        setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η φόρτωση των πελατών.",
        variant: "destructive",
      });
      // Ensure loading state is removed
        setLoading(false);
    }
  }, [searchTerm, searchColumn, selectedCustomerTypes, availableCustomerTypes, statusFilter]);

  // Add useEffect to fetch customers on mount
  useEffect(() => {
    console.log('🔄 Initial customer data fetch');
    fetchCustomers();
  }, [fetchCustomers]);

  // Add a useEffect to run fetch when search, filters or status changes
  useEffect(() => {
    fetchCustomers();
  }, [debouncedSearchTerm, searchColumn, debouncedCustomerTypes, statusFilter, fetchCustomers]);

  // Define refreshCustomers early to avoid reference issues
  const refreshCustomers = useCallback(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  // Define handlers for offers early to avoid reference issues
  const handleCreateOffer = useCallback((customerId: string, source: string = "Email") => {
    // Open the dialog
    openNewOfferDialog(customerId, source, () => {
      // Update the offers for this specific customer
      fetchCustomerOffers(customerId);
      
      // Set the expanded state to true for this customer
      setExpandedCustomers(prev => ({
        ...prev,
        [customerId]: true
      }));
    });
  }, [fetchCustomerOffers]);
  
  const handleEditOffer = useCallback((customerId: string, offerId: string) => {
    openEditOfferDialog(customerId, offerId, async () => {
      // Force refresh the offers after edit
      await fetchCustomerOffers(customerId, true);
      
      setExpandedCustomers(prev => ({
        ...prev,
        [customerId]: true
      }));
    });
  }, [fetchCustomerOffers]);
  
  const handleDeleteOffer = useCallback((customerId: string, offerId: string) => {
    setOfferToDelete({ customerId, offerId });
    setShowDeleteOfferDialog(true);
  }, []);
  
  // Add the confirmDeleteOffer function 
  const confirmDeleteOffer = useCallback(async () => {
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
      
      // Immediately update the UI by removing the offer from the state
      setCustomerOffers(prev => {
        const updatedOffers = { ...prev };
        if (updatedOffers[offerToDelete.customerId]) {
          updatedOffers[offerToDelete.customerId] = updatedOffers[offerToDelete.customerId]
            .filter(offer => offer.id !== offerToDelete.offerId);
        }
        return updatedOffers;
      });
      
      // Update the offers count in the customers list
      const newOffersCount = (customerOffers[offerToDelete.customerId]?.length || 1) - 1;
      
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === offerToDelete.customerId 
            ? { ...customer, offersCount: newOffersCount } 
            : customer
        )
      );
      
      setFilteredCustomers(prev => 
        prev.map(customer => 
          customer.id === offerToDelete.customerId 
            ? { ...customer, offersCount: newOffersCount } 
            : customer
        )
      );
      
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
  }, [offerToDelete, customerOffers]);

  // Update toggleCustomerExpanded to use cached data
  const toggleCustomerExpanded = useCallback(async (customerId: string) => {
    // Find the customer to check offer count
    const customer = customers.find(c => c.id === customerId);
    if (!customer || (customer.offersCount || 0) === 0) {
      // Don't expand customers with no offers
      return;
    }
    
    const isCurrentlyExpanded = expandedCustomers[customerId] || false;
    
    // Immediately update UI state for better responsiveness
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !isCurrentlyExpanded
    }));
    
    setCustomers(prev => 
      prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, isExpanded: !isCurrentlyExpanded } 
          : customer
      )
    );
    
    setFilteredCustomers(prev => 
      prev.map(customer => 
        customer.id === customerId 
          ? { ...customer, isExpanded: !isCurrentlyExpanded } 
          : customer
      )
    );
    
    // Then fetch data if needed (asynchrously, after UI is updated)
    if (!isCurrentlyExpanded && !customerOffers[customerId]) {
      fetchCustomerOffers(customerId);
    }
  }, [customers, expandedCustomers, customerOffers, fetchCustomerOffers]);

  // Format status for display
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

  // Format result for display
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

  // Format source for display
  const formatSource = (source: string) => {
    switch (source) {
      case "Email":
        return "Email";
      case "Phone":
      case "Telephone":
        return "Τηλέφωνο";
      case "Website":
      case "Site":
        return "Ιστοσελίδα";
      case "In Person":
      case "Physical":
        return "Φυσική παρουσία";
      default:
        return source;
    }
  };

  // Move toggleCustomerStatus function before columns definition
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

  // Add scrollbar styles at the component level, not inside renderDirectTable
  useEffect(() => {
    // Create style for explicit scrollbar
    const style = document.createElement('style');
    style.textContent = `
      .custom-table-scrollbar::-webkit-scrollbar {
        width: 10px !important;
        height: 10px !important;
        display: block !important;
      }
      .custom-table-scrollbar::-webkit-scrollbar-track {
        background: #2f3e46 !important;
        border-radius: 10px !important;
      }
      .custom-table-scrollbar::-webkit-scrollbar-thumb {
        background-color: #52796f !important;
        border-radius: 10px !important;
        border: 2px solid #2f3e46 !important;
      }
      .custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: #84a98c !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Update the renderDirectTable function to use the scrollbar styles without using hooks inside it
  const renderDirectTable = () => {
    // Render loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 bg-[#2f3e46] rounded-lg border border-[#52796f]">
          <LoadingSpinner fullScreen={false} />
          <span className="ml-3 text-[#cad2c5]">Φόρτωση πελατών...</span>
        </div>
      );
    }
    
    // Fallback to original direct table implementation to preserve all functionality
        return (
      <div className="rounded-lg border border-[#52796f]">
        <div 
          className="custom-table-scrollbar" 
          style={{ 
            height: "550px", 
            overflowY: "auto",
            overflowX: "auto",
            msOverflowStyle: "scrollbar",
            scrollbarWidth: "thin",
            scrollbarColor: "#52796f #2f3e46"
          }}
        >
          <table className="border-collapse bg-transparent" style={{ minWidth: "100%" }}>
            <thead className="bg-[#2f3e46] sticky top-0 z-10" style={{ boxShadow: '0 1px 0 #52796f' }}>
              <tr>
                {columns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`
                      text-center text-[#84a98c] py-2 px-3 text-sm font-medium select-none
                      ${col.accessor !== "expand" && col.accessor !== "actions" ? "cursor-pointer hover:text-white" : ""}
                      relative
                    `}
                    style={{ 
                      width: columnWidths[col.accessor] || col.width || 'auto',
                      minWidth: columnWidths[col.accessor] || col.width || 'auto',
                      position: 'relative',
                    }}
            onClick={(e) => {
                      // Only handle sort click if we're not resizing
                      if (!isResizing) {
                        col.accessor !== "expand" && col.accessor !== "actions" && handleSort(col.accessor);
                      }
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <span>{col.header}</span>
                      {col.accessor === sortColumn && col.accessor !== "expand" && col.accessor !== "actions" && (
                        <span className="text-white ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                    {col.accessor !== "expand" && col.accessor !== "actions" && (
                      <div
                        className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center z-10"
                        onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
                          const startX = e.clientX;
                          const startWidth = parseInt(columnWidths[col.accessor] || col.width || '100px', 10);
                          
                          const onMouseMove = (moveEvent) => {
                            moveEvent.preventDefault();
                            moveEvent.stopPropagation();
                            const width = Math.max(80, startWidth + (moveEvent.clientX - startX));
                            setColumnWidths(prev => ({
                              ...prev,
                              [col.accessor]: `${width}px`
                            }));
                          };
                          
                          const onMouseUp = () => {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                            document.body.style.cursor = '';
                            
                            // Small delay to prevent click event from triggering sort
                            setTimeout(() => {
                              setIsResizing(false);
                            }, 100);
                          };
                          
                          setIsResizing(true);
                          document.addEventListener('mousemove', onMouseMove);
                          document.addEventListener('mouseup', onMouseUp);
                          document.body.style.cursor = 'col-resize';
                        }}
                      >
                        <div className="w-[1px] h-2/5 bg-[#52796f] hover:bg-[#84a98c] rounded-full"></div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#52796f]/30">
              {sortedCustomers.map((customer, index) => (
                <CustomerContextMenu
                  key={`context-${customer.id || index}`} 
                  customerId={customer.id}
                  onCreateOffer={handleCreateOffer}
                >
                  <React.Fragment key={customer.id || index}>
                    <tr 
                      className={`
                        bg-transparent
                        hover:bg-[#3d5a5e] cursor-pointer 
                        transition-colors duration-150 border-b border-[#52796f]/30
                        ${lastUpdatedCustomerId === customer.id ? 'bg-[#52796f]/40 hover:bg-[#52796f]/50' : ''}
                      `}
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      data-customer-id={customer.id}
                    >
                      {columns.map((col, colIdx) => (
                        <td 
                          key={colIdx} 
                          className="p-2 text-[#cad2c5] text-sm font-normal whitespace-nowrap"
                          style={{
                            width: columnWidths[col.accessor] || col.width || 'auto',
                            minWidth: columnWidths[col.accessor] || col.width || 'auto',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          <div className="overflow-hidden text-ellipsis">
                            {col.accessor === "expand" && col.cell 
                              ? col.cell(null, customer) 
                              : col.cell 
                                ? col.cell(customer[col.accessor], customer)
                                : customer[col.accessor] || "-"}
                          </div>
                        </td>
                      ))}
                    </tr>
                    
                    {/* Handle expanded rows */}
                    {(expandedCustomers[customer.id] || false) && (
                      <tr className="bg-[#2f3e46] border-t border-b border-[#52796f]">
                        <td colSpan={columns.length}>
                          <div className="pl-[70px] pr-4 py-3">
                            {loadingOffers[customer.id] ? (
                              <div className="flex justify-center items-center py-4">
                                <LoadingSpinner fullScreen={false} />
                              </div>
                            ) : (customerOffers[customer.id]?.length || 0) === 0 ? (
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
                                    {customerOffers[customer.id]?.map((offer, offerIdx) => (
                                      <tr 
                                        key={offer.id} 
                                        className={`
                                          border-t border-[#52796f]/30 
                                          bg-transparent
                                          hover:bg-[#354f52] cursor-pointer
                                          transition-colors duration-150
                                        `}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditOffer(customer.id, offer.id);
                                        }}
                                      >
                                        <td className="px-2 py-1.5 text-xs text-[#cad2c5] w-[160px] font-medium">
                                          <div className="overflow-hidden text-ellipsis">
                                            {formatDateTime(offer.created_at)}
                                          </div>
                                        </td>
                                        <td className="px-3 py-1.5 text-xs text-[#cad2c5] w-[100px]">
                                          {offer.requirements 
                                            ? <TruncateWithTooltip 
                                                text={offer.requirements} 
                                                maxLength={50} 
                                                maxWidth={800}
                                                multiLine={false}
                                                maxLines={2}
                                              /> 
                                            : "-"}
                                        </td>
                                        <td className="px-3 py-1.5 text-xs text-[#cad2c5] w-[100px] font-medium">
                                          {offer.amount 
                                            ? <TruncateWithTooltip 
                                                text={offer.amount} 
                                                maxLength={50} 
                                                maxWidth={800}
                                                multiLine={false}
                                                maxLines={2}
                                              /> 
                                            : "-"}
                                        </td>
                                        <td className="px-3 py-2 text-xs w-[140px]">
                                          <span className={`
                                            ${offer.offer_result === "wait_for_our_answer" ? "text-yellow-400" : 
                                              offer.offer_result === "wait_for_customer_answer" ? "text-blue-400" : 
                                              offer.offer_result === "ready" ? "text-green-400" : "text-gray-400"}
                                            font-medium
                                          `}>
                                            {formatStatus(offer.offer_result)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs w-[100px]">
                                          <span className={`
                                            ${offer.result === "success" ? "text-green-400" : 
                                              offer.result === "failed" ? "text-red-400" : 
                                              offer.result === "cancel" ? "text-yellow-400" :
                                              offer.result === "waiting" ? "text-purple-400" : "text-gray-400"}
                                            font-medium
                                          `}>
                                            {formatResult(offer.result)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-center w-[50px]">
                                          {isAdminOrSuperUser && (
                                            <GlobalTooltip content="Διαγραφή προσφοράς">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteOffer(customer.id, offer.id);
                                                }}
                                                className="h-6 w-6 hover:bg-[#354f52] text-red-500 hover:text-red-400"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </GlobalTooltip>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                </CustomerContextMenu>
              ))}
            </tbody>
          </table>
            </div>
          </div>
    );
  };

  // Define columns for table rendering
  const columns = useMemo(() => [
    {
      header: "",
      accessor: "expand",
      width: "50px",
      cell: (_, row) => {
        // Only show expand button if customer has offers
        if (!row.offersCount || row.offersCount === 0) {
          return <div className="w-8 h-8"></div>;
        }
        
        const isExpanded = expandedCustomers[row.id] || false;
        
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              toggleCustomerExpanded(row.id);
            }}
            className={`h-8 w-8 rounded-full transition-colors ${
              isExpanded 
                ? "bg-[#52796f] text-white" 
                : "bg-transparent text-[#84a98c] hover:bg-[#52796f] hover:text-white"
            }`}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <div className="flex items-center">
                <ChevronRight className="h-5 w-5" />
                <span className="text-sm">{row.offersCount}</span>
              </div>
            )}
          </Button>
        );
      }
    },
    { 
      header: "Επωνυμία", 
      accessor: "company_name",
      width: "250px",
      cell: (value, row) => {
        // If first_name and last_name exists but not company_name, show them instead
        if ((!value || value === "") && row.first_name && row.last_name) {
          return <span>{row.first_name} {row.last_name}</span>;
        }
        return <span>{value || "—"}</span>;
      }
    },
    { 
      header: "Τύπος", 
      accessor: "customer_type",
      width: "150px"
    },
    { 
      header: "ΑΦΜ", 
      accessor: "afm",
      width: "100px"
    },
    { 
      header: "Email", 
      accessor: "email",
      width: "150px"
    },
    { 
      header: "Τηλέφωνο", 
      accessor: "telephone",
      width: "150px"
    },
    { 
      header: "Διεύθυνση", 
      accessor: "address",
      width: "200px"
    },
    {
      header: "Ημερομηνία",
      accessor: "created_at",
      width: "150px",
      cell: (value) => value ? formatDateTime(value) : "—"
    },
    {
      header: "Ενέργειες",
      accessor: "actions",
      width: "100px",
      cell: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <GlobalTooltip content={`${row.status === 'active' ? 'Απενεργοποίηση' : 'Ενεργοποίηση'} Πελάτη`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleCustomerStatus(row);
              }}
              className={`h-6 w-6 hover:bg-[#354f52] ${
                row.status === 'active' ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'
              }`}
            >
              {row.status === 'active' ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </GlobalTooltip>
          
          {isAdminOrSuperUser && (
            <GlobalTooltip content="Διαγραφή Πελάτη">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomerToDelete(row);
                    setShowDeleteAlert(true);
                }}
                className="h-6 w-6 hover:bg-[#354f52] text-red-500 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </GlobalTooltip>
          )}
          </div>
      )
    },
  ], [expandedCustomers, isAdminOrSuperUser, navigate, setSelectedCustomer, setShowDialog, toggleCustomerExpanded, toggleCustomerStatus]);

  // Initialize columnWidths after columns are defined
  useEffect(() => {
    if (columns.length > 0 && Object.keys(columnWidths).length === 0) {
      // Initialize column widths
      const initialWidths = {};
      columns.forEach(column => {
        initialWidths[column.accessor] = column.width || '100px';
      });
      setColumnWidths(initialWidths);
    }
  }, [columns, columnWidths]);

  // Handle column selection
  const handleColumnChange = useCallback((column) => {
    setSearchColumn(column);
    setSearchTerm(""); // Reset search term when column changes
  }, []);
  
  return (
    <div className="p-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#cad2c5] mb-2">
          Διαχείριση Πελατών
        </h1>
        <Button
          onClick={() => {
            setSelectedCustomer(null);
            setShowDialog(true);
          }}
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
            availableTypes={availableCustomerTypes}
            selectedTypes={selectedCustomerTypes}
            onChange={setSelectedCustomerTypes}
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

      {renderDirectTable()}
      
      {!loading && (
        <div className="mt-4 text-sm text-[#84a98c] text-right">
          Βρέθηκαν <span className="text-white font-medium">{totalCount}</span> εγγραφές.
        </div>
      )}
      
      <CustomerDialog
        open={showDialog}
        onOpenChange={(open) => setShowDialog(open)}
        customer={selectedCustomer ? {
          ...selectedCustomer,
          id: typeof selectedCustomer.id === 'string' 
            ? selectedCustomer.id 
            : String(selectedCustomer.id)
        } : undefined}
        refreshData={fetchCustomers}
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
                  deletionInProgressRef.current = true;
                  
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
                  
                  // Update the UI to remove the deleted customer
                  setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
                  setFilteredCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
                  
                  // Show success message
                  toast({
                    title: "Επιτυχία",
                    description: "Ο πελάτης διαγράφηκε επιτυχώς",
                    variant: "default",
                  });
                  
                  setDeleteSuccess(true);
                } catch (error) {
                  console.error("Error deleting customer:", error);
                  toast({
                    title: "Σφάλμα",
                    description: "Δεν ήταν δυνατή η διαγραφή του πελάτη",
                    variant: "destructive",
                  });
                } finally {
                  setIsDeletingCustomer(false);
                  deletionInProgressRef.current = false;
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
