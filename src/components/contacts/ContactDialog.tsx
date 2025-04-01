import React, { useState, useEffect, CSSProperties } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { X, Star, Check, Plus, Edit } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { PositionDialog } from "./PositionDialog";
import { useFormRegistration } from '@/lib/FormContext';
import { usePhoneFormat } from "@/hooks/usePhoneFormat";
import { logDebug } from "../../utils/loggingUtils";
import { useDataService } from '@/hooks/useDataService';
import { db } from '@/database';

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  contactId?: string;
  refreshData?: () => void;
}

interface CustomerInfo {
  company_name: string;
  id?: string;
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
    position_name: "",
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [positions, setPositions] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ company_name: "" });
  const [loading, setLoading] = useState(true);
  
  // Position dialog state
  const [editingPosition, setEditingPosition] = useState<{ id: string; name: string } | null>(null);
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | undefined>(undefined);
  const [newPositionName, setNewPositionName] = useState("");
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);

  // Initialize data services
  const { 
    getById: getContactById, 
    create: createContact, 
    update: updateContact 
  } = useDataService<any>('contacts');
  
  const { 
    getById: getCustomerById 
  } = useDataService<any>('customers');
  
  const contactPositionsService = db.contactPositions;

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
      setError(null); // Reset error state when dialog opens
      
      // If editing an existing contact, fetch its data
      if (contactId) {
        fetchContactData();
      } else {
        // Reset form data for new contact
        setFormData({
          full_name: "",
          position: "",
          position_name: "",
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
      setError(null);
      
      // Reset all form data including telephone fields when dialog closes
      // This ensures that when opening a new contact dialog after closing, all fields are cleared
      setFormData({
        full_name: "",
        position: "",
        position_name: "",
        telephone: "",
        mobile: "",
        email: "",
        internal_telephone: "",
        notes: "",
      });
      
      setTelephone("");
      setMobile("");
    }
  }, [open]);

  const fetchContactData = async () => {
    if (!contactId) return;
    
    try {
      setLoading(true);
      
      // Use DataService instead of direct supabase call
      const contactData = await getContactById(contactId);
      
      if (contactData) {
        // Update form data
        setFormData({
          full_name: contactData.full_name || "",
          position: contactData.position_id || "",  // Set position ID here
          position_name: contactData.position || "",
          telephone: contactData.telephone || "",
          mobile: contactData.mobile || "",
          email: contactData.email || "",
          internal_telephone: contactData.internal_telephone || "",
          notes: contactData.notes || "",
        });
        
        // Update phone format hooks
        setTelephone(contactData.telephone || "");
        setMobile(contactData.mobile || "");
        
        // Set selected position if it exists
        if (contactData.position_id) {
          setSelectedPosition(contactData.position_id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching contact data:", error);
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
      
      // Use DataService instead of direct supabase call
      const customer = await getCustomerById(safeCustomerId);
      
      if (customer) {
        setCustomerInfo({
          id: safeCustomerId,
          company_name: customer.company_name || "Πελάτης",
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching customer info:", error);
      setError("Αδυναμία φόρτωσης στοιχείων πελάτη");
      setLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      logDebug("Fetching positions...");
      const { data: positionsList, error } = await contactPositionsService.getAll({
        // No need for explicit deleted_at filter, DataService handles it automatically
        order: {
          column: 'name',
          ascending: true
        }
      });
      
      logDebug("Positions response:", positionsList);
      
      if (error) {
        console.error("Error fetching positions:", error);
        return;
      }
      
      if (positionsList) {
        // Map positions to include both id and name
        const mappedPositions = positionsList.map(p => ({ id: p.id, name: p.name }));
        logDebug("Mapped positions:", mappedPositions);
        setPositions(mappedPositions);
      } else {
        logDebug("No positions returned");
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  const handlePositionChange = (positionId: string) => {
    const selectedPos = positions.find(p => p.id === positionId);
    setSelectedPosition(positionId);
    setFormData(prev => ({
      ...prev,
      position: positionId,
      position_name: selectedPos?.name || ""
    }));
  };

  const handleEditPosition = (position: string | { id: string; name: string }) => {
    if (typeof position === 'string') {
      const foundPosition = positions.find(p => p.id === position || p.name === position);
      if (foundPosition) {
        setEditingPosition(foundPosition);
        setPositionDialogOpen(true);
      }
    } else {
      setEditingPosition(position);
      setPositionDialogOpen(true);
    }
  };

  const isFormValid = () => {
    return formData.full_name.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Get the selected position object
      const selectedPositionObj = positions.find(p => p.id === selectedPosition);

      // Prepare contact data
      const contactData = {
        full_name: formData.full_name.trim(),
        position: selectedPositionObj?.name || null,
        telephone: telephoneValue || null,
        mobile: mobileValue || null,
        email: formData.email?.trim() || null,
        internal_telephone: formData.internal_telephone?.trim() || null,
        notes: formData.notes?.trim() || null,
        customer_id: safeCustomerId,
        position_id: selectedPositionObj?.id || null,
        status: 'active'
      };

      logDebug("Submitting contact data:", contactData);

      // Ensure phone numbers are treated as strings
      if (contactData.telephone) {
        contactData.telephone = String(contactData.telephone).trim();
      }
      if (contactData.mobile) {
        contactData.mobile = String(contactData.mobile).trim();
      }

      let result;
      if (contactId) {
        result = await updateContact(contactId, contactData);
      } else {
        result = await createContact(contactData);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Reset form
      setFormData({
        full_name: "",
        position: "",
        position_name: "",
        telephone: "",
        mobile: "",
        email: "",
        internal_telephone: "",
        notes: "",
      });
      
      setTelephone("");
      setMobile("");
      
      if (refreshData) {
        refreshData();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving contact:", error);
      setError("Αδυναμία αποθήκευσης επαφής");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPosition = async () => {
    setIsAddingPosition(true);
    setPositionError(null);
    
    try {
      if (!newPositionName || newPositionName.trim() === "") {
        setPositionError("Enter a position name");
        return;
      }
      
      // Check if position already exists
      if (positions.find(p => p.name.trim() === newPositionName.trim())) {
        setPositionError("Position already exists");
        return;
      }
      
      // Use DataService to create new position
      const { data: newPosition, error } = await contactPositionsService.create({ 
        name: newPositionName.trim() 
      });
      
      if (error || !newPosition) {
        throw new Error(error?.message || "Failed to create position");
      }
      
      // Update positions list with new position
      setPositions([...positions, { id: newPosition.id, name: newPosition.name }]);
      
      // Set the new position in the form
      setFormData({
        ...formData,
        position: newPosition.id,
        position_name: newPosition.name,
      });
      
      // Close the position dialog
      setPositionDialogOpen(false);
      setNewPositionName("");
    } catch (error) {
      console.error("Error adding position:", error);
      setPositionError("Error adding position");
    } finally {
      setIsAddingPosition(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setError(null);
          setPositionDialogOpen(false);
          setSelectedPosition(undefined);
          
          setFormData({
            full_name: "",
            position: "",
            position_name: "",
            telephone: "",
            mobile: "",
            email: "",
            internal_telephone: "",
            notes: "",
          });
          
          setTelephone("");
          setMobile("");
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent 
        className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f] p-0 max-w-5xl overflow-hidden"
        aria-labelledby="contact-dialog-title"
        aria-describedby="contact-dialog-description"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-4 py-2 border-b border-[#52796f] bg-[#2f3e46]">
            <DialogTitle className="text-lg font-semibold text-[#cad2c5]">
              {customerInfo && (
                <span className="text-[#84a98c] mr-2">{customerInfo.company_name} -</span>
              )}
              {contactId ? "Επεξεργασία Επαφής" : "Νέα Επαφή"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#a8c5b5]">
              {customerInfo.company_name}
            </DialogDescription>
          </DialogHeader>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 bg-[#2f3e46]">
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
                        onChange={handleMobileChange}
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
                        options={positions}
                        value={formData.position}
                        onSelect={handlePositionChange}
                        onEdit={handleEditPosition}
                        showEditButton={true}
                        placeholder="Επιλέξτε θέση..."
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
                        onChange={handleTelephoneChange}
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
                  <div className="h-[120px]">
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="app-input w-full h-full bg-[#2f3e46] border-[#52796f] text-[#cad2c5] resize-none py-1 px-2"
                      placeholder="Προσθέστε σημειώσεις για την επαφή..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with buttons */}
            <div className="flex flex-col gap-4 px-4 py-4 border-t border-[#52796f] bg-[#2f3e46]">
              {error && (
                <div className="mt-2 text-sm text-red-500 bg-red-100/10 px-3 py-2 rounded border border-red-500/20">
                  {error}
                </div>
              )}
              <div className="flex justify-end items-center gap-2">
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
            </div>
          </div>
        </form>
      </DialogContent>

      <PositionDialog
        open={positionDialogOpen}
        onOpenChange={setPositionDialogOpen}
        position={editingPosition}
        onSave={() => {
          fetchPositions();
          setEditingPosition(null);
        }}
      />
    </Dialog>
  );
}
