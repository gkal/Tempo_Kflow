import React, { useState, useEffect, CSSProperties } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X, Star, Check, Plus, Edit } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { PositionDialog } from "./PositionDialog";
import { useFormRegistration } from '@/lib/FormContext';
import { usePhoneFormat } from "@/hooks/usePhoneFormat";

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  contactId?: string;
  refreshData?: () => void;
}

export function ContactDialog({
  open,
  onOpenChange,
  customerId,
  contactId,
  refreshData,
}: ContactDialogProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    position: "",
    telephone: "",
    mobile: "",
    email: "",
    internal_telephone: "",
    notes: "",
  });

  // Phone formatting hooks
  const { 
    phoneValue: telephoneValue, 
    handlePhoneChange: handleTelephoneChange, 
    setPhone: setTelephone,
    inputRef: telephoneInputRef
  } = usePhoneFormat(formData.telephone);
  
  const { 
    phoneValue: mobileValue, 
    handlePhoneChange: handleMobileChange, 
    setPhone: setMobile,
    inputRef: mobileInputRef
  } = usePhoneFormat(formData.mobile);

  const [positions, setPositions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<{ company_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Position dialog state
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | undefined>(undefined);

  // Fix the type issue with customerId
  const safeCustomerId = typeof customerId === 'string' 
    ? customerId 
    : typeof customerId === 'object' && customerId !== null 
      ? (customerId as any).id ? String((customerId as any).id) : String(customerId)
      : String(customerId);

  // Register this form when it's open
  useFormRegistration(
    contactId 
      ? "Επεξεργασία Επαφής" 
      : "Νέα Επαφή", 
    open
  );

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      fetchCustomerInfo();
      fetchPositions();
      setSuccess(false); // Reset success state when dialog opens
      setError(null); // Reset error state when dialog opens
      
      // If editing an existing contact, fetch its data
      if (contactId) {
        fetchContactData();
      } else {
        // Reset form data for new contact
        setFormData({
          full_name: "",
          position: "",
          telephone: "",
          mobile: "",
          email: "",
          internal_telephone: "",
          notes: "",
        });
      }
    } else {
      // Reset state when dialog closes
      setPositionDialogOpen(false); // Ensure position dialog is closed when contact dialog closes
      setSelectedPosition(undefined);
    }
  }, [open, safeCustomerId, contactId]);
  
  // Also reset success state when dialog closes
  useEffect(() => {
    if (!open) {
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  const fetchContactData = async () => {
    if (!contactId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .is("deleted_at", null)
        .single();
        
      if (error) {
        console.error("Σφάλμα κατά τη φόρτωση στοιχείων επαφής:", error);
        setError("Αδυναμία φόρτωσης στοιχείων επαφής");
        setLoading(false);
        return;
      }
      
      if (data) {
        setFormData({
          full_name: data.full_name || "",
          position: data.position || "",
          telephone: data.telephone || "",
          mobile: data.mobile || "",
          email: data.email || "",
          internal_telephone: data.internal_telephone || "",
          notes: data.notes || "",
        });
        
        // Update phone values in the custom hooks
        setTelephone(data.telephone || "");
        setMobile(data.mobile || "");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Σφάλμα κατά τη φόρτωση στοιχείων επαφής:", err);
      setError("Αδυναμία φόρτωσης στοιχείων επαφής");
      setLoading(false);
    }
  };

  const fetchCustomerInfo = async () => {
    if (!safeCustomerId) {
      setError("Δεν βρέθηκε αναγνωριστικό πελάτη");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use the safe string ID in the API call
      const { data, error } = await supabase
        .from('customers')
        .select('company_name')
        .eq('id', safeCustomerId)
        .single();

      if (error) {
        console.error("Σφάλμα κατά τη φόρτωση στοιχείων πελάτη:", error);
        setError("Αδυναμία φόρτωσης στοιχείων πελάτη");
        setLoading(false);
        return;
      }

      setCustomerInfo(data);
      setLoading(false);
    } catch (err) {
      console.error("Σφάλμα κατά τη φόρτωση στοιχείων πελάτη:", err);
      setError("Αδυναμία φόρτωσης στοιχείων πελάτη");
      setLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_positions")
        .select("name")
        .order("name");

      if (error) throw error;
      
      // Add positions from the database
      setPositions(data.map((pos) => pos.name));
    } catch (error) {
      console.error("Σφάλμα κατά τη φόρτωση θέσεων:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Handle telephone and mobile separately with our custom hooks
    if (name === "telephone" && e.target instanceof HTMLInputElement) {
      const result = handleTelephoneChange(e as React.ChangeEvent<HTMLInputElement>);
      setFormData((prev) => ({
        ...prev,
        [name]: result.value,
      }));
      return;
    }
    
    if (name === "mobile" && e.target instanceof HTMLInputElement) {
      const result = handleMobileChange(e as React.ChangeEvent<HTMLInputElement>);
      setFormData((prev) => ({
        ...prev,
        [name]: result.value,
      }));
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePositionChange = (value: string) => {
    // Check if "Προσθήκη θέσης..." was selected
    if (value === "add_new_position") {
      setSelectedPosition(undefined); // No position selected for editing
      setPositionDialogOpen(true);
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      position: value,
    }));
  };
  
  // Add a function to handle right-click on the dropdown
  const handlePositionRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (formData.position && formData.position !== "add_new_position") {
      console.log("Right-clicked position:", formData.position);
      setSelectedPosition(formData.position);
      setPositionDialogOpen(true);
    }
  };

  const handleEditPosition = (position: string) => {
    setSelectedPosition(position);
    setPositionDialogOpen(true);
  };

  const isFormValid = () => {
    return formData.full_name.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    setError("");
    setSuccess(false);
    
    try {
      if (contactId) {
        // Update existing contact
        const { error } = await supabase
          .from("contacts")
          .update({
            full_name: formData.full_name,
            position: formData.position,
            telephone: formData.telephone,
            mobile: formData.mobile,
            email: formData.email,
            internal_telephone: formData.internal_telephone,
            notes: formData.notes,
            updated_at: new Date(),
          })
          .eq("id", contactId);

        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase.from("contacts").insert({
          customer_id: safeCustomerId,
          full_name: formData.full_name,
          position: formData.position,
          telephone: formData.telephone,
          mobile: formData.mobile,
          email: formData.email,
          internal_telephone: formData.internal_telephone,
          notes: formData.notes,
        });

        if (error) throw error;
      }

      // Call onSave immediately to refresh the contacts list
      await refreshData?.();
      
      // Show success message briefly
      setSuccess(true);
      
      // Close the dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (error: any) {
      console.error("Σφάλμα κατά την αποθήκευση επαφής:", error);
      setError(error.message || "Προέκυψε σφάλμα κατά την αποθήκευση της επαφής.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get all position options including "Add new position"
  const getPositionOptions = () => {
    return [...positions, "add_new_position"];
  };
  
  // Custom renderer for position dropdown items
  const renderPositionOption = (option: string): React.ReactNode => {
    if (option === "add_new_position") {
      return (
        <div className="flex items-center text-blue-400 font-medium">
          <Plus className="mr-2 h-4 w-4" />
          <span>Προσθήκη θέσης...</span>
        </div>
      );
    }
    return option;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          setSuccess(false);
          setError(null);
          // Ensure position dialog is closed when contact dialog closes
          setPositionDialogOpen(false);
          setSelectedPosition(undefined);
        }
        onOpenChange(newOpen);
      }}>
        <DialogContent 
          className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f] p-0 max-w-5xl"
          aria-describedby="contact-dialog-description"
        >
          <DialogHeader className="p-4 border-b border-[#52796f]">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-lg font-semibold text-[#cad2c5]">
                {customerInfo && (
                  <span className="text-[#84a98c] mr-2">{customerInfo.company_name} -</span>
                )}
                {contactId ? "Επεξεργασία Επαφής" : "Νέα Επαφή"}
              </DialogTitle>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-[#cad2c5]"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription id="contact-dialog-description" className="sr-only">
              {contactId ? "Φόρμα επεξεργασίας επαφής" : "Φόρμα δημιουργίας νέας επαφής"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-0">
            {/* Two columns layout for the first two sections */}
            <div className="grid grid-cols-2 gap-10 p-8 pt-4">
              {/* Group 1: Basic Contact Information */}
              <div className="space-y-0">
                <div className="bg-[#3a5258] p-2 rounded-t-md border border-[#52796f] border-b-0">
                  <h3 className="text-sm font-medium text-[#a8c5b5] uppercase tracking-wider border-b border-[#52796f] pb-1 -mx-2 px-2">ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ</h3>
                </div>
                
                <div className="bg-[#3a5258] p-6 rounded-b-md space-y-4 border border-[#52796f] border-t-0">
                  <div className="flex items-center" style={{ marginBottom: '20px' }}>
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                      Ονοματεπώνυμο <span className="text-red-500">*</span>
                    </div>
                    <div className="w-2/3">
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className="app-input w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center" style={{ marginBottom: '20px' }}>
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                      Κινητό
                    </div>
                    <div className="w-2/3">
                      <Input
                        id="mobile"
                        name="mobile"
                        value={mobileValue}
                        onChange={handleInputChange}
                        className="app-input w-full"
                        ref={mobileInputRef}
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                      Email
                    </div>
                    <div className="w-2/3">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="app-input w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Professional Information */}
              <div className="space-y-0">
                <div className="bg-[#3a5258] p-2 rounded-t-md border border-[#52796f] border-b-0">
                  <h3 className="text-sm font-medium text-[#a8c5b5] uppercase tracking-wider border-b border-[#52796f] pb-1 -mx-2 px-2">ΕΠΑΓΓΕΛΜΑΤΙΚΑ ΣΤΟΙΧΕΙΑ</h3>
                </div>
                
                <div className="bg-[#3a5258] p-6 rounded-b-md space-y-4 border border-[#52796f] border-t-0">
                  <div className="flex items-center" style={{ marginBottom: '20px' }}>
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                      Θέση
                    </div>
                    <div className="w-2/3">
                      <GlobalDropdown
                        options={getPositionOptions()}
                        value={formData.position}
                        onSelect={handlePositionChange}
                        onEdit={(position) => {
                          setSelectedPosition(position);
                          setPositionDialogOpen(true);
                        }}
                        placeholder="Επιλέξτε θέση"
                        className="w-full"
                        renderOption={renderPositionOption}
                        showEditButton={true}
                      />
                    </div>
                  </div>

                  <div className="flex items-center" style={{ marginBottom: '20px' }}>
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                      Τηλέφωνο
                    </div>
                    <div className="w-2/3">
                      <Input
                        id="telephone"
                        name="telephone"
                        value={telephoneValue}
                        onChange={handleInputChange}
                        className="app-input w-full"
                        ref={telephoneInputRef}
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                      Εσωτ. Τηλέφωνο
                    </div>
                    <div className="w-2/3">
                      <Input
                        id="internal_telephone"
                        name="internal_telephone"
                        value={formData.internal_telephone}
                        onChange={handleInputChange}
                        className="app-input w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section - Full Width */}
            <div className="px-8 pb-8">
              <div className="space-y-0">
                <div className="bg-[#3a5258] p-2 rounded-t-md border border-[#52796f] border-b-0">
                  <h3 className="text-sm font-medium text-[#a8c5b5] uppercase tracking-wider border-b border-[#52796f] pb-1 -mx-2 px-2">ΣΗΜΕΙΩΣΕΙΣ</h3>
                </div>
                
                <div className="bg-[#3a5258] p-6 rounded-b-md space-y-4 border border-[#52796f] border-t-0">
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="app-input w-full bg-[#2f3e46] border-[#52796f] text-[#cad2c5] min-h-[100px]"
                    placeholder="Προσθέστε σημειώσεις για την επαφή..."
                  />
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
                  <Check className="mr-1 h-4 w-4" />
                  Η επαφή αποθηκεύτηκε με επιτυχία!
                </div>
              )}
              
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
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
                onClick={() => onOpenChange(false)}
                className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52]"
              >
                Ακύρωση
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Position Dialog */}
      <PositionDialog
        open={positionDialogOpen}
        onOpenChange={setPositionDialogOpen}
        position={selectedPosition}
        onSave={fetchPositions}
      />
    </>
  );
}
