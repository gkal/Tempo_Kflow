import React, { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { supabase } from '@/lib/supabaseClient';
import { toast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useFormRegistration } from '@/lib/FormContext';

interface PositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: { id: string; name: string };
  onSave: () => void;
}

export function PositionDialog({
  open,
  onOpenChange,
  position,
  onSave,
}: PositionDialogProps) {
  const [name, setName] = useState(position?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Register this form when it's open
  useFormRegistration(
    position 
      ? `Επεξεργασία Θέσης: ${position.name}` 
      : "Νέα Θέση", 
    open
  );

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName(position?.name || "");
      setError(null);
      setSuccess(false);
    }
  }, [open, position]);

  // Ensure dialog is properly closed when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any pending timeouts or state
      setSuccess(false);
      setError(null);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Το όνομα της θέσης είναι υποχρεωτικό");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (position) {
        // Editing existing position
        const { error: updateError } = await supabase
          .from("contact_positions")
          .update({ name: name.trim() })
          .eq("id", position.id);
          
        if (updateError) throw updateError;
        
        toast({
          title: "Επιτυχής ενημέρωση",
          description: "Η θέση ενημερώθηκε με επιτυχία",
        });
      } else {
        // Adding new position
        const { error: insertError } = await supabase
          .from("contact_positions")
          .insert({ name: name.trim() });
          
        if (insertError) throw insertError;
        
        toast({
          title: "Επιτυχής προσθήκη",
          description: "Η θέση προστέθηκε με επιτυχία",
        });
      }
      
      setSuccess(true);
      
      // Call onSave to refresh positions
      onSave();
      
      // Close dialog after a short delay
      const timeoutId = setTimeout(() => {
        setSuccess(false);
        setError(null);
        onOpenChange(false);
      }, 800);
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(timeoutId);
    } catch (err: any) {
      console.error("Σφάλμα κατά την αποθήκευση θέσης:", err);
      setError(err.message || "Προέκυψε σφάλμα κατά την αποθήκευση της θέσης");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Ensure all state is reset before closing
    setSuccess(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setSuccess(false);
          setError(null);
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent 
        className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f] p-0 max-w-md fixed top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]"
        aria-labelledby="position-dialog-title"
      >
        <DialogHeader className="p-4 border-b border-[#52796f]">
          <div className="flex justify-between items-center">
            <DialogTitle id="position-dialog-title" className="text-lg font-semibold text-[#cad2c5]">
              {position ? "Επεξεργασία Θέσης" : "Νέα Θέση"}
            </DialogTitle>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-[#cad2c5]"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-0">
          {/* Form content */}
          <div className="p-6">
            <div className="bg-[#3a5258] p-6 rounded-md border border-[#52796f] shadow-md">
              <div className="flex items-center" style={{ marginBottom: '20px' }}>
                <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                  Όνομα Θέσης <span className="text-red-500">*</span>
                </div>
                <div className="w-2/3">
                  <Input
                    id="position-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#354f52] border-[#52796f] text-[#cad2c5] w-full placeholder:text-[#a8c5b5] placeholder:opacity-80"
                    placeholder="π.χ. Διευθυντής, Γραμματέας, κλπ."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer with buttons */}
          <div className="flex justify-end items-center gap-2 p-4 border-t border-[#52796f] bg-[#2f3e46]">
            {error && (
              <div className="text-red-500 mr-auto">{error}</div>
            )}
            
            {success && (
              <div className="text-green-500 mr-auto flex items-center">
                <span className="mr-1">✓</span>
                Η θέση αποθηκεύτηκε με επιτυχία!
              </div>
            )}
            
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="bg-[#52796f] text-white hover:bg-[#52796f]/90"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Αποθήκευση...
                </>
              ) : (
                "Αποθήκευση"
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52]"
            >
              Ακύρωση
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
