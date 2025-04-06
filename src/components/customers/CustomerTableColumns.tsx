// Customer table columns configuration
// Extracted from CustomersPage.tsx to improve modularity

import React from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { Customer } from "./types/CustomerTypes";
import { formatDate } from "./utils/CustomerFormatUtils";

const columnHelper = createColumnHelper<Customer>();

interface CreateColumnsProps {
  expandedCustomerIds: Record<string, boolean>;
  handleExpand: (customerId: string, isCurrentlyExpanded: boolean) => void;
  renderCustomerActions: (row: any) => React.ReactNode;
}

export const createCustomerColumns = ({
  expandedCustomerIds,
  handleExpand,
  renderCustomerActions
}: CreateColumnsProps) => [
  // Expand/Collapse column
  columnHelper.accessor("id", {
    header: "",
    id: "expander",
    cell: ({ row }) => {
      const customerId = row.original.id;
      const isExpanded = !!expandedCustomerIds[customerId];
      const hasOffers = (row.original.offers_count || 0) > 0;
      
      return (
        <div 
          className={`cursor-pointer p-1 ${hasOffers ? "" : "opacity-30"}`}
          onClick={() => {
            if (hasOffers) {
              handleExpand(customerId, isExpanded);
            }
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      );
    },
    size: 40,
  }),
  
  // Company Name column
  columnHelper.accessor("company_name", {
    header: "ΕΠΩΝΥΜΙΑ",
    cell: ({ row }) => (
      <div className="font-medium">
        <TruncateWithTooltip text={row.original.company_name || ""} maxLength={30} />
      </div>
    ),
    size: 250,
  }),
  
  // Email column
  columnHelper.accessor("email", {
    header: "EMAIL",
    cell: ({ row }) => (
      <div className="text-sm">
        <TruncateWithTooltip text={row.original.email || ""} maxLength={25} />
      </div>
    ),
    size: 200,
  }),
  
  // Telephone column
  columnHelper.accessor("telephone", {
    header: "ΤΗΛΕΦΩΝΟ",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.telephone || "—"}
      </div>
    ),
    size: 150,
  }),
  
  // Address column
  columnHelper.accessor("address", {
    header: "ΔΙΕΥΘΥΝΣΗ",
    cell: ({ row }) => (
      <div className="text-sm">
        <TruncateWithTooltip text={row.original.address || ""} maxLength={30} />
      </div>
    ),
    size: 200,
  }),
  
  // AFM column
  columnHelper.accessor("afm", {
    header: "ΑΦΜ",
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.afm || "—"}
      </div>
    ),
    size: 120,
  }),
  
  // Created At column
  columnHelper.accessor("created_at", {
    header: "ΗΜΕΡΟΜΗΝΙΑ",
    cell: ({ row }) => (
      <div className="text-sm">
        {formatDate(row.original.created_at || null)}
      </div>
    ),
    size: 150,
  }),
  
  // Actions column
  columnHelper.accessor("actions", {
    header: "",
    id: "actions",
    cell: ({ row }) => renderCustomerActions(row),
    size: 80,
  }),
];
