// Customer table columns configuration
// Extracted from CustomersPage.tsx to improve modularity

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  FileText, 
  Phone, 
  Mail, 
  Users
} from "lucide-react";
import { Customer } from "./types/customerTypes";
import { createColumnHelper } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";

// Utility functions
const formatDate = (date: string | null | undefined): string => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("el-GR");
};

// Create a column helper for Customer type
const columnHelper = createColumnHelper<Customer>();

// Define type for DropdownItem
interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: (customerId: string) => void;
}

// Define type for customer columns props
export interface CustomerTableColumnProps {
  onViewOffers: (customerId: string) => void;
  onViewProfile: (customerId: string) => void;
  onContact: (customer: Customer) => void;
  onSendEmail: (customer: Customer) => void;
}

export const getCustomerColumns = ({
  onViewOffers,
  onViewProfile,
  onContact,
  onSendEmail
}: CustomerTableColumnProps): ColumnDef<Customer, any>[] => {
  return [
    columnHelper.accessor("company_name", {
      header: "Επωνυμία",
      cell: ({ row }) => {
        // Check if customer has offers
        const hasOffers = false; // We'll need to get this from a different source
        
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.company_name}</span>
            {hasOffers && (
              <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">
                Προσφορές
              </span>
            )}
          </div>
        );
      }
    }),
    
    columnHelper.accessor("telephone", {
      header: "Τηλέφωνο",
      cell: ({ row }) => {
        return (
          <div className="flex items-center">
            <span className="text-gray-600">{row.original.telephone || "-"}</span>
            {row.original.telephone && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 h-6 w-6 text-gray-500 hover:text-blue-500"
                onClick={() => onContact(row.original)}
              >
                <Phone className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      }
    }),
    
    columnHelper.accessor("email", {
      header: "Email",
      cell: ({ row }) => {
        return (
          <div className="flex items-center">
            <span className="text-gray-600">{row.original.email || "-"}</span>
            {row.original.email && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 h-6 w-6 text-gray-500 hover:text-blue-500"
                onClick={() => onSendEmail(row.original)}
              >
                <Mail className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      }
    }),
    
    // Create a custom column for actions
    {
      id: "actions",
      header: "Ενέργειες",
      cell: ({ row }) => {
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-blue-500"
              onClick={() => onViewProfile(row.original.id)}
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-blue-500"
              onClick={() => onViewOffers(row.original.id)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];
};
