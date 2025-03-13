import React, { useState } from "react";
import { OfferRow } from "./OfferRow";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchBarStyles } from "@/lib/styles/search-bar";

interface OffersTableProps {
  offers: any[];
  expandedOffers: Record<string, boolean>;
  onToggleExpand: (offerId: string) => void;
  onEditClick: (offerId: string) => void;
  onDeleteClick: (offerId: string) => void;
  isAdminOrSuperUser: boolean;
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function OffersTable({
  offers,
  expandedOffers,
  onToggleExpand,
  onEditClick,
  onDeleteClick,
  isAdminOrSuperUser,
  isLoading,
  searchTerm,
  onSearchChange,
}: OffersTableProps) {
  return (
    <div className="bg-[#354f52] rounded-lg border border-[#52796f] overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-[#52796f]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Αναζήτηση..."
            className={cn(
              searchBarStyles.inputClasses,
              searchBarStyles.containerClasses
            )}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[#2f3e46] sticky top-0 z-10">
            <tr>
              <th className="p-2 text-left text-[#84a98c] font-normal text-sm w-10"></th>
              <th className="p-2 text-left text-[#84a98c] font-normal text-sm">Πελάτης</th>
              <th className="p-2 text-left text-[#84a98c] font-normal text-sm">Ζήτηση Πελάτη</th>
              <th className="p-2 text-left text-[#84a98c] font-normal text-sm">Ποσό</th>
              <th className="p-2 text-left text-[#84a98c] font-normal text-sm">Κατάσταση</th>
              <th className="p-2 text-left text-[#84a98c] font-normal text-sm">Αποτέλεσμα</th>
              <th className="p-2 text-left text-[#84a98c] font-normal text-sm">Ημ/νία Δημιουργίας</th>
              <th className="p-2 text-center text-[#84a98c] font-normal text-sm w-24">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#84a98c]"></div>
                  </div>
                </td>
              </tr>
            ) : offers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-[#84a98c]">
                  {searchTerm ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν υπάρχουν προσφορές"}
                </td>
              </tr>
            ) : (
              offers.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  isExpanded={expandedOffers[offer.id] || false}
                  onToggleExpand={onToggleExpand}
                  onEditClick={onEditClick}
                  onDeleteClick={onDeleteClick}
                  isAdminOrSuperUser={isAdminOrSuperUser}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#52796f] text-sm text-[#84a98c]">
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <span>Φόρτωση δεδομένων</span>
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 rounded-full bg-[#84a98c] animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : offers.length === 0 ? (
          <span>Δεν βρέθηκαν εγγραφές</span>
        ) : offers.length === 1 ? (
          <span>Βρέθηκε 1 εγγραφή</span>
        ) : (
          <span>Βρέθηκαν <strong className="text-[#cad2c5]">{offers.length}</strong> εγγραφές</span>
        )}
        {!isLoading && searchTerm && (
          <span> για την αναζήτηση "<strong className="text-[#cad2c5]">{searchTerm}</strong>"</span>
        )}
      </div>
    </div>
  );
} 