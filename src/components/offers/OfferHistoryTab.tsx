import React, { useState, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";
import OfferHistory from './OfferHistory';

interface OfferHistoryTabProps {
  offerId: string;
  isEditing: boolean;
}

export default function OfferHistoryTab({ offerId, isEditing }: OfferHistoryTabProps) {
  // Only show history tab when editing an existing offer
  if (!isEditing || !offerId) {
    return null;
  }

  return (
    <div className="mt-4 border border-[#52796f] rounded-md overflow-hidden">
      <AppTabs defaultValue="history" className="w-full">
        <AppTabsList className="w-full bg-[#354f52] border-b border-[#52796f]">
          <AppTabsTrigger 
            value="history" 
            className="flex-1 data-[state=active]:bg-[#2f3e46] data-[state=active]:text-[#cad2c5]"
          >
            Ιστορικό Προσφοράς
          </AppTabsTrigger>
        </AppTabsList>
        <AppTabsContent value="history" className="p-0 bg-[#2f3e46]">
          <OfferHistory offerId={offerId} />
        </AppTabsContent>
      </AppTabs>
    </div>
  );
} 