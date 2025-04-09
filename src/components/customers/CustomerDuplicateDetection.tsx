/**
 * CustomerDuplicateDetection component
 * Handles duplicate customer detection for CustomerForm
 * Extracted from CustomerForm.tsx to improve modularity
 */

import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { checkForDuplicates } from "./utils/customerValidation";
import { getDuplicateMatchReasons } from "./utils/customerFormUtils";
import { useCustomerForm } from "./CustomerFormProvider";
import { Customer } from "./types/CustomerTypes";
import * as duplicateDetectionService from "@/services/duplicate-detection";
import { createPrefixedLogger } from "@/utils/loggingUtils";

// Initialize logger
const logger = createPrefixedLogger('CustomerDuplicateDetection');

export const CustomerDuplicateDetection: React.FC = () => {
  // Get necessary state and functions from context
  const {
    formData,
    potentialMatches,
    detailDialogOpen,
    selectedCustomerId,
    selectedCustomerScore,
    setPotentialMatches,
    setDetailDialogOpen,
    setSelectedCustomerId,
    setSelectedCustomerScore,
    handleViewCustomer
  } = useCustomerForm();

  // Local state for UI
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  
  // Check for potential duplicates as form data changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Only check if we have at least one meaningful field filled
      if (formData.company_name.trim() || formData.telephone.trim() || formData.afm.trim()) {
        setIsDuplicateChecking(true);
        
        try {
          // Call the duplicate detection service
          const matches = await checkForDuplicates(
            formData,
            async (searchInput) => {
              // Use findPotentialDuplicates directly since checkDuplicates isn't available
              return await duplicateDetectionService.findPotentialDuplicates(searchInput);
            }
          );
          
          // Update the list of potential matches
          setPotentialMatches(matches);
        } catch (error) {
          logger.error("Error checking for duplicates:", error);
        } finally {
          setIsDuplicateChecking(false);
        }
      }
    }, 500); // Debounce the check
    
    return () => clearTimeout(timer);
  }, [
    formData.company_name,
    formData.telephone,
    formData.afm
  ]);

  // Handle viewing the details of a potential match
  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerScore(customer.score);
    setDetailDialogOpen(true);
  };

  // Handle navigating to a customer record
  const handleNavigate = () => {
    if (selectedCustomerId) {
      handleViewCustomer(selectedCustomerId);
    }
    setDetailDialogOpen(false);
  };

  // Show nothing if no matches
  if (potentialMatches.length === 0) {
    return null;
  }

  return (
    <>
      {/* Potential matches warning */}
      <div className="mb-4 p-3 bg-amber-900/30 border border-amber-600/50 rounded-md">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-amber-400 font-semibold mb-1">
              Πιθανές διπλοεγγραφές ({potentialMatches.length})
            </p>
            <p className="text-amber-300/90 text-sm mb-2">
              Βρέθηκαν πιθανές διπλοεγγραφές. Παρακαλώ ελέγξτε πριν προχωρήσετε.
            </p>
            
            {/* Display potential matches */}
            <div className="space-y-2">
              {potentialMatches.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between bg-amber-950/40 border border-amber-700/30 rounded-md p-2"
                >
                  <div>
                    <p className="text-amber-200 font-medium">
                      {customer.company_name}
                    </p>
                    <div className="flex text-xs text-amber-300/80 space-x-4 mt-0.5">
                      <span>{customer.telephone}</span>
                      {customer.afm && <span>ΑΦΜ: {customer.afm}</span>}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-xs text-amber-400 underline mt-1">
                          Ομοιότητα: {Math.round(customer.score || 0)}%
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60 p-2 text-xs">
                        <div className="space-y-1">
                          <p className="font-medium">Ταίριαξε βάσει:</p>
                          <p>{getDuplicateMatchReasons(customer.matchReasons || {})}</p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(customer)}
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-950"
                  >
                    Λεπτομέρειες
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer detail dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Λεπτομέρειες Πελάτη</DialogTitle>
            <DialogDescription>
              Πιθανή διπλοεγγραφή (Ομοιότητα: {selectedCustomerScore}%)
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            <p className="text-sm text-gray-300 mb-4">
              Αυτός ο πελάτης φαίνεται να είναι παρόμοιος με αυτόν που προσπαθείτε να προσθέσετε.
              Θέλετε να δείτε την καρτέλα του πελάτη αντί να δημιουργήσετε νέο;
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailDialogOpen(false)}
            >
              Συνέχεια Προσθήκης
            </Button>
            <Button type="button" onClick={handleNavigate}>
              Προβολή Πελάτη <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 