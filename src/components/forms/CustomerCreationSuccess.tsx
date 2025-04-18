import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import SendFormLinkButton from "./SendFormLinkButton";

interface CustomerCreationSuccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  onView?: () => void;
  onClose?: () => void;
}

/**
 * Success dialog shown after customer creation
 * Includes a Send Form Link button and options to view customer or close
 */
export default function CustomerCreationSuccess({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerEmail,
  onView,
  onClose
}: CustomerCreationSuccessProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2f3e46] border-[#52796f] max-w-md">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-5 w-5 text-green-500" />
          </div>
          <DialogTitle className="text-xl text-[#cad2c5]">
            Επιτυχής Δημιουργία
          </DialogTitle>
        </div>
        
        <DialogDescription className="text-[#a8c5b5]">
          Ο πελάτης <span className="font-semibold text-[#cad2c5]">{customerName}</span> δημιουργήθηκε με επιτυχία.
        </DialogDescription>
        
        <div className="flex flex-col space-y-5 pt-2">
          <div className="bg-[#354f52] p-4 rounded-md border border-[#52796f]/30">
            <h3 className="text-[#a8c5b5] font-medium mb-3">
              Αποστολή Φόρμας Πελάτη
            </h3>
            
            <p className="text-sm text-[#cad2c5]/80 mb-4">
              Δημιουργήστε και στείλτε ένα σύνδεσμο φόρμας για τον πελάτη. Ο πελάτης μπορεί να συμπληρώσει τη φόρμα online.
            </p>
            
            <SendFormLinkButton 
              customerId={customerId}
              emailRecipient={customerEmail}
              expirationHours={72}
              size="default"
              variant="secondary"
            />
          </div>
          
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              className="border-[#52796f] text-[#cad2c5]"
              onClick={() => {
                if (onClose) onClose();
                onOpenChange(false);
              }}
            >
              Κλείσιμο
            </Button>
            
            <Button
              variant="default"
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
              onClick={() => {
                if (onView) onView();
                onOpenChange(false);
              }}
            >
              Προβολή Πελάτη
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
