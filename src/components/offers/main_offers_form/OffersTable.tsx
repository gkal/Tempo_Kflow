import React, { useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import { VirtualDataTable } from "@/components/ui/virtual-table/VirtualDataTable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/GlobalTooltip";
import { formatDateTime } from "@/utils/formatUtils";
import { supabase } from "@/lib/supabaseClient";
import type { Database } from "@/types/supabase";
import { Column } from "@/components/ui/virtual-table/VirtualDataTable";

type DatabaseOffer = Database["public"]["Tables"]["offers"]["Row"] & {
  assigned_user?: { fullname: string } | null;
};

interface Offer extends DatabaseOffer {}

interface OffersTableProps {
  customerId: string;
  onClose?: () => void;
}

export interface OffersTableRef {
  refreshData: () => Promise<void>;
}

const OffersTable = forwardRef<OffersTableRef, OffersTableProps>(({ customerId, onClose }, ref) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOffers, setExpandedOffers] = useState<Record<string, boolean>>({});

  const handleEditOffer = useCallback((row: Offer) => {
    // Implementation of edit offer
    console.log('Edit offer:', row);
  }, []);

  const handleDeleteOffer = useCallback((id: string) => {
    // Implementation of delete offer
    console.log('Delete offer:', id);
  }, []);

  const toggleOfferExpanded = useCallback((offerId: string) => {
    setExpandedOffers(prev => ({
      ...prev,
      [offerId]: !prev[offerId]
    }));
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*, assigned_user:assigned_to(fullname)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convert the data to match our Offer type
      const formattedData = (data || []).map(offer => {
        const typedOffer: Offer = {
          ...offer,
          assigned_user: offer.assigned_user || null
        };
        return typedOffer;
      });
      
      setOffers(formattedData);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useImperativeHandle(ref, () => ({
    refreshData
  }));

  const columns = useMemo(() => [
    {
      id: "expand",
      header: "",
      cell: ({ row }: { row: Offer }) => {
        const isExpanded = expandedOffers[row.id] || false;
        return (
          <div 
            className="flex items-center justify-center w-full h-full"
            onClick={(e) => {
              e.stopPropagation();
              toggleOfferExpanded(row.id);
            }}
          >
            <div className="flex items-center justify-center relative group cursor-pointer hover:bg-[#52796f]/60 rounded-full w-7 h-7 transition-colors duration-200">
              <span className="absolute inset-0 rounded-full bg-[#52796f]/0 group-hover:bg-[#52796f]/30 transition-colors duration-200"></span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#84a98c] group-hover:text-white relative z-10" />
              )}
            </div>
          </div>
        );
      },
      meta: {
        className: "w-[40px]"
      }
    },
    {
      id: "created_at",
      header: "Ημ/νία Δημιουργίας",
      cell: ({ row }: { row: Offer }) => formatDateTime(row.created_at),
      meta: {
        className: "w-[120px]"
      }
    },
    {
      id: "requirements",
      header: "Απαιτήσεις",
      cell: ({ row }: { row: Offer }) => row.requirements || <span className="text-xs text-[#52796f]">-</span>,
      meta: {
        className: "w-[300px]"
      }
    },
    {
      id: "amount",
      header: "Ποσό",
      cell: ({ row }: { row: Offer }) => row.amount || <span className="text-xs text-[#52796f]">-</span>,
      meta: {
        className: "w-[100px]"
      }
    },
    {
      id: "assigned_user",
      header: "Ανατέθηκε σε",
      cell: ({ row }: { row: Offer }) => row.assigned_user?.fullname || <span className="text-xs text-[#52796f]">-</span>,
      meta: {
        className: "w-[150px]"
      }
    },
    {
      id: "result",
      header: "Αποτέλεσμα",
      cell: ({ row }: { row: Offer }) => row.result || <span className="text-xs text-[#52796f]">-</span>,
      meta: {
        className: "w-[150px]"
      }
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: { row: Offer }) => (
        <div className="flex items-center justify-end gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditOffer(row);
                  }}
                  className="p-1 hover:bg-[#52796f]/60 rounded-full transition-colors duration-200"
                >
                  <Edit className="h-4 w-4 text-[#84a98c]" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Επεξεργασία</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOffer(row.id);
                  }}
                  className="p-1 hover:bg-[#52796f]/60 rounded-full transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4 text-[#84a98c]" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Διαγραφή</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      meta: {
        className: "w-[100px]"
      }
    }
  ] as Column<Offer>[], [expandedOffers, toggleOfferExpanded, handleEditOffer, handleDeleteOffer]);

  return (
    <VirtualDataTable
      data={offers}
      columns={columns}
      isLoading={loading}
      expandedRowIds={expandedOffers}
      onExpandRow={toggleOfferExpanded}
      getRowId={(row) => row.id}
      showSearchBar={true}
      searchColumns={[
        { accessor: "requirements", header: "Απαιτήσεις" },
        { accessor: "amount", header: "Ποσό" },
        { accessor: "result", header: "Αποτέλεσμα" }
      ]}
      emptyStateMessage="Δεν βρέθηκαν προσφορές"
      loadingStateMessage="Φόρτωση προσφορών..."
    />
  );
});

export default OffersTable;
