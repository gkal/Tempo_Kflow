import React, { useEffect, useState } from 'react';
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
  // Use state to track form validity instead of calling the function directly in render
  const [formIsValid, setFormIsValid] = useState(true);
  
  // Update form validity when dependencies change
  useEffect(() => {
    // Only call isFormValid if it's a function
    if (typeof isFormValid === 'function') {
      setFormIsValid(isFormValid());
    }
  }, [isFormValid, watchOfferResult, watchResult]);

  return (
    <DialogFooter className="mt-4 pt-2 flex items-center justify-between border-t border-[#52796f]">
      {/* 
        Important: The margin-top (mt-4) and padding-top (pt-2) values are critical
        for maintaining proper spacing between the tab content and the footer buttons.
        The border-t creates a visual separation between content and footer.
      */}
      <div className="flex-1 mr-1">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-0.5 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 text-green-400 p-0.5 rounded-md text-sm">
            Η αποθήκευση ολοκληρώθηκε με επιτυχία!
          </div>
        )}
        {watchOfferResult === "ready" && (watchResult === "none" || !watchResult) && !error && !success && (
          <div className="bg-yellow-500/10 text-yellow-400 p-0.5 rounded-md text-sm">
            Όταν η κατάσταση είναι "Ολοκληρώθηκε", πρέπει να επιλέξετε ένα αποτέλεσμα.
          </div>
        )}
      </div>
      <div className="flex space-x-1">
        <Button
          type="submit"
          disabled={loading || !formIsValid}
          className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] h-8 text-sm px-3"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Αποθήκευση"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5] h-8 text-sm px-3"
        >
          Ακύρωση
        </Button>
      </div>
    </DialogFooter>
  );
};

export default DialogFooterSection; 