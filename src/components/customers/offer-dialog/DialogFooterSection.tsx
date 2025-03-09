import React from 'react';
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DialogFooterSection = ({ 
  error,
  success,
  loading,
  isEditing,
  isFormValid,
  watchOfferResult,
  watchResult,
  onOpenChange
}) => {
  return (
    <DialogFooter className="mt-6 flex items-center justify-between">
      <div className="flex-1 mr-4">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-2 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 text-green-400 p-2 rounded-md text-sm">
            Η αποθήκευση ολοκληρώθηκε με επιτυχία!
          </div>
        )}
        {watchOfferResult === "ready" && (watchResult === "none" || !watchResult) && !error && !success && (
          <div className="bg-yellow-500/10 text-yellow-400 p-2 rounded-md text-sm">
            Όταν η κατάσταση είναι "Ολοκληρώθηκε", πρέπει να επιλέξετε ένα αποτέλεσμα.
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <Button
          type="submit"
          disabled={loading || !isFormValid()}
          className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
        >
          {isEditing ? "Ενημέρωση" : "Αποθήκευση"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
        >
          Ακύρωση
        </Button>
      </div>
    </DialogFooter>
  );
};

export default DialogFooterSection; 