/**
 * CustomerExpandedContent component
 * Extracted from CustomersPage.tsx to improve modularity
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { Customer, CustomerOffer } from "./types/interfaces";
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { Loader } from "@/components/ui/Loader";
import { openEditOfferDialog } from '@/components/offers/main_offers_form/OfferDialogManager';
import { 
  formatDate, 
  formatStatus, 
  formatResult, 
  getStatusClass, 
  getResultClass 
} from './utils/formatters';

interface CustomerExpandedContentProps {
  customer: Customer;
  customerId: string;
  customerOffers: Record<string, CustomerOffer[]>;
  loadingOffers: Record<string, boolean>;
  isAdminOrSuperUser: boolean;
  onDeleteClick: (offerId: string, customerId: string) => void;
}

export const CustomerExpandedContent: React.FC<CustomerExpandedContentProps> = ({
  customer,
  customerId,
  customerOffers,
  loadingOffers,
  isAdminOrSuperUser,
  onDeleteClick
}) => {
  const offers = customerOffers[customerId] || [];
  const isLoading = loadingOffers[customerId] || false;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader fullScreen={false} />
        <span className="ml-3 text-[#cad2c5]">Φόρτωση προσφορών...</span>
      </div>
    );
  }
  
  if (offers.length === 0) {
    return (
      <div className="py-4 text-[#84a98c] flex flex-col items-center justify-center gap-3">
        <div className="text-center">
          Δεν υπάρχουν προσφορές για αυτόν τον πελάτη
        </div>
      </div>
    );
  }
  
  // Render offers table
  return (
    <div className="overflow-visible pl-[70px] pr-4 py-4 relative">
      <div className="bg-[#2f3e46] rounded-md border border-[#52796f] shadow-sm w-[1000px]">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col className="w-[150px]" />
            <col className="w-[200px]" />
            <col className="w-[200px]" />
            <col className="w-[150px]" />
            <col className="w-[100px]" />
            {isAdminOrSuperUser && <col className="w-[80px]" />}
          </colgroup>
          <thead className="bg-[#2f3e46] relative z-10 after:absolute after:content-[''] after:left-0 after:right-0 after:bottom-0 after:h-[1px] after:bg-[#52796f]">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ημερομηνία</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ζήτηση Πελάτη</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Ποσό</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-[#84a98c] border-r border-[#52796f]">Κατάσταση</th>
              <th className={`px-2 py-2 text-left text-xs font-medium text-[#84a98c] ${isAdminOrSuperUser ? 'border-r border-[#52796f]' : ''}`}>Αποτέλεσμα</th>
              {isAdminOrSuperUser && (
                <th className="px-2 py-2 text-center text-xs font-medium text-[#84a98c]">Ενέργειες</th>
              )}
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr 
                key={offer.id} 
                className="border-t border-[#52796f]/30 bg-[#2f3e46] hover:bg-[#354f52]/50 cursor-pointer transition-colors duration-150"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Open edit dialog instead of navigating
                  openEditOfferDialog(customerId, offer.id, () => {
                    // We don't need to do anything here as real-time updates will handle the UI
                  });
                }}
              >
                <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                  {formatDate(offer.date)}
                </td>
                <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                  {offer.requirements ? (
                    <TruncateWithTooltip 
                      text={offer.requirements} 
                      maxLength={30}
                      maxWidth={800}
                      multiLine={false}
                      maxLines={1}
                      position="top"
                      className="cursor-pointer"
                    />
                  ) : <span className="text-xs text-[#52796f]">-</span>}
                </td>
                <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                  {offer.value ? (
                    <TruncateWithTooltip 
                      text={offer.value} 
                      maxLength={30}
                      maxWidth={800}
                      multiLine={false}
                      maxLines={1}
                      position="top"
                      className="cursor-pointer"
                    />
                  ) : <span className="text-xs text-[#52796f]">-</span>}
                </td>
                <td className="px-2 py-2 text-xs text-[#cad2c5] border-r border-[#52796f]">
                  <span className={getStatusClass(offer.status)}>
                    {formatStatus(offer.status) || <span className="text-xs text-[#52796f]">-</span>}
                  </span>
                </td>
                <td className={`px-2 py-2 text-xs text-[#cad2c5] ${isAdminOrSuperUser ? 'border-r border-[#52796f]' : ''}`}>
                  <span className={getResultClass(offer.result)}>
                    {formatResult(offer.result || '') || <span className="text-xs text-[#52796f]">-</span>}
                  </span>
                </td>
                {isAdminOrSuperUser && (
                  <td className="px-2 py-2 text-xs text-center">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteClick(offer.id, customerId);
                      }}
                      className="p-1 rounded-full hover:bg-[#354f52] text-red-500 hover:text-red-400 transition-colors"
                      aria-label="Διαγραφή προσφοράς"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 
