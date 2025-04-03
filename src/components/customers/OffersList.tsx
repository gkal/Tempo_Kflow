import React from 'react';
import { CustomerOffer } from '@/types/CustomerTypes';
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import { formatCurrency } from '@/utils/formatters';
import { formatDate, formatStatus, formatResult } from '@/utils/formatters';
import { getStatusClass, getResultClass } from '@/utils/styleUtils';
import { TruncateWithTooltip } from '@/components/ui/GlobalTooltip';

interface OffersListProps {
  offers: CustomerOffer[];
  isLoading: boolean;
  onViewOffer: (offerId: string) => void;
  onDeleteOffer: (offerId: string) => void;
  isAdminOrSuperUser: boolean;
}

export const OffersList: React.FC<OffersListProps> = ({
  offers,
  isLoading,
  onViewOffer,
  onDeleteOffer,
  isAdminOrSuperUser
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No offers available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <div
          key={offer.id}
          className="flex items-center justify-between p-4 bg-background rounded-lg border"
        >
          <div className="space-y-1">
            <h4 className="font-medium">{offer.title}</h4>
            <div className="text-sm text-muted-foreground">
              <p>Amount: €{offer.amount.toLocaleString()}</p>
              <p>Status: {offer.status}</p>
              <p>Created: {formatDate(offer.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewOffer(offer.id)}
              className="hover:bg-accent"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {isAdminOrSuperUser && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteOffer(offer.id)}
                className="hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}; 