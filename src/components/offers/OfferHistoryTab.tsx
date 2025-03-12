import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="w-full bg-[#354f52] border-b border-[#52796f]">
          <TabsTrigger 
            value="history" 
            className="flex-1 data-[state=active]:bg-[#2f3e46] data-[state=active]:text-[#cad2c5]"
          >
            Ιστορικό Προσφοράς
          </TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="p-0 bg-[#2f3e46]">
          <OfferHistory offerId={offerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 