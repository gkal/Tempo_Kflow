// Component for displaying expanded customer offers
// Extracted from CustomersPage.tsx to improve modularity

import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { Customer, CustomerOffer } from "./types/customerTypes";

// Format utility functions
const formatCurrency = (value?: number): string => {
  if (value === undefined || value === null) return '€0.00';
  return new Intl.NumberFormat('el-GR', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(value);
};

const formatDate = (date?: string | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('el-GR');
};

// Status formatting
const formatStatus = (status?: string): string => {
  if (!status) return 'Άγνωστο';
  return status;
};

const getStatusClass = (status?: string): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  return 'bg-blue-100 text-blue-800';
};

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
  if (offers.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500 text-sm">
        Δεν υπάρχουν προσφορές για αυτόν τον πελάτη.
      </div>
    );
  }

  // Function to handle clicking on an offer
  const handleOfferClick = (offerId: string) => {
    console.log(`Opening offer ${offerId} for customer ${customerId}`);
    // For now, just log the action since openEditOfferDialog is not available
  };

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
                onClick={() => handleOfferClick(offer.id)}
              >
                <div className="flex justify-between">
                  <div className="font-medium text-gray-900">
                    <TruncateWithTooltip text={offer.offer_number || 'Προσφορά'} maxLength={40} />
                  </div>
                  <div className="font-medium text-gray-900">
                    {formatCurrency(offer.total_amount)}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatDate(offer.created_at)}
                </div>
                <div className="flex mt-2 gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(
                      offer.status
                    )}`}
                  >
                    {formatStatus(offer.status)}
                  </span>
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
