import React from "react";
import { formatDateTime } from "@/utils/formatUtils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OfferDetails } from "./OfferDetails";

interface OfferRowProps {
  offer: any;
  isExpanded: boolean;
  onToggleExpand: (offerId: string) => void;
  onEditClick: (offerId: string) => void;
  onDeleteClick: (offerId: string) => void;
  isAdminOrSuperUser: boolean;
}

export function OfferRow({
  offer,
  isExpanded,
  onToggleExpand,
  onEditClick,
  onDeleteClick,
  isAdminOrSuperUser,
}: OfferRowProps) {
  if (!offer) return null;

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
        return status || "—";
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
      case "pending":
        return "Σε εξέλιξη";
      case "waiting":
        return "Αναμονή";
      case "none":
        return "Κανένα";
      default:
        return result || "—";
    }
  };

  return (
    <>
      <tr
        className="border-b border-[#52796f]/30 hover:bg-[#354f52]/50 transition-colors cursor-pointer"
        onClick={() => onToggleExpand(offer.id)}
      >
        {/* Expand/Collapse button */}
        <td className="p-2 text-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(offer.id);
            }}
            className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </td>

        {/* Customer */}
        <td className="p-2 text-[#cad2c5]">
          <div className="font-medium">
            {offer.customer?.[0]?.company_name || "—"}
          </div>
        </td>

        {/* Requirements */}
        <td className="p-2 text-[#cad2c5]">
          {offer.requirements ? (
            <div className="truncate max-w-[250px]" title={offer.requirements}>
              {offer.requirements}
            </div>
          ) : (
            "—"
          )}
        </td>

        {/* Amount */}
        <td className="p-2 text-[#cad2c5]">
          {offer.amount ? `${offer.amount}€` : "—"}
        </td>

        {/* Status */}
        <td className="p-2">
          <span
            className={`
              inline-block px-2 py-1 rounded-full text-xs font-medium
              ${
                offer.offer_result === "wait_for_our_answer"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : offer.offer_result === "wait_for_customer_answer"
                  ? "bg-blue-500/20 text-blue-400"
                  : offer.offer_result === "ready"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-500/20 text-gray-400"
              }
            `}
          >
            {formatStatus(offer.offer_result)}
          </span>
        </td>

        {/* Result */}
        <td className="p-2">
          <span
            className={`
              inline-block px-2 py-1 rounded-full text-xs font-medium
              ${
                offer.result === "success"
                  ? "bg-green-500/20 text-green-400"
                  : offer.result === "failed"
                  ? "bg-red-500/20 text-red-400"
                  : offer.result === "cancel"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : offer.result === "pending"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-gray-500/20 text-gray-400"
              }
            `}
          >
            {formatResult(offer.result)}
          </span>
        </td>

        {/* Created At */}
        <td className="p-2 text-[#cad2c5] whitespace-nowrap">
          {formatDateTime(offer.created_at)}
        </td>

        {/* Actions */}
        <td className="p-2">
          <div className="flex items-center justify-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(offer.id);
                    }}
                    className="h-8 w-8 hover:bg-[#354f52] text-[#cad2c5]"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Επεξεργασία</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {isAdminOrSuperUser && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClick(offer.id);
                      }}
                      className="h-8 w-8 hover:bg-[#354f52] text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Διαγραφή</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded details */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="p-0 bg-[#2f3e46]">
            <OfferDetails offer={offer} onEditClick={onEditClick} />
          </td>
        </tr>
      )}
    </>
  );
} 