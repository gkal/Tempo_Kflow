// Component for displaying expanded customer offers
// Extracted from CustomersPage.tsx to improve modularity

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { CustomerOffer } from "./types/CustomerTypes";
import { 
  formatCurrency, 
  formatDate, 
  formatStatus, 
  formatResult,
  getStatusClass,
  getResultClass
} from "./utils/CustomerFormatUtils";
import { openEditOfferDialog } from '@/components/offers/main_offers_form/OfferDialogManager';

interface CustomerOffersSectionProps {
  customerId: string;
  offers: CustomerOffer[];
  onDeleteClick: (offerId: string, e: React.MouseEvent) => void;
}

export const CustomerOffersSection: React.FC<CustomerOffersSectionProps> = ({
  customerId,
  offers,
  onDeleteClick
}) => {
  if (!offers || offers.length === 0) {
    return (
      <div className="py-2 px-4 text-gray-500 italic">
        Δεν υπάρχουν προσφορές για αυτόν τον πελάτη.
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-2 rounded-md">
      <div className="text-sm font-medium text-gray-500 mb-2 px-2">
        Προσφορές ({offers.length})
      </div>
      <div className="space-y-2">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="bg-white p-3 rounded-md shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div 
                className="flex-1 cursor-pointer" 
                onClick={() => openEditOfferDialog(customerId, offer.id)}
              >
                <div className="flex justify-between">
                  <div className="font-medium text-gray-900">
                    <TruncateWithTooltip text={offer.name} maxLength={40} />
                  </div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(parseFloat(offer.value) || 0)}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatDate(offer.date)}
                </div>
                <div className="flex mt-2 gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                      offer.status
                    )}`}
                  >
                    {formatStatus(offer.status)}
                  </span>
                  {offer.result && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResultClass(
                        offer.result
                      )}`}
                    >
                      {formatResult(offer.result)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-red-500"
                onClick={(e) => onDeleteClick(offer.id, e)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {offer.requirements && (
              <div className="mt-2 text-sm">
                <div className="font-medium text-gray-700">Ζήτηση:</div>
                <div className="text-gray-600 whitespace-pre-wrap">
                  <TruncateWithTooltip text={offer.requirements} maxLength={100} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
