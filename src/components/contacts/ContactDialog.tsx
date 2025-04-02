import React, { useState, useEffect, CSSProperties } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { supabase } from '@/lib/supabaseClient';
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

  const fetchPositions = async () => {
    try {
      const { data: positionsList, error } = await contactPositionsService.getAll({
        order: {
          column: 'name',
          ascending: true
        }
      });
      
      if (error) {
        console.error("Error fetching positions:", error);
        return;
      }
      
      if (positionsList) {
        // Map positions to include both id and name
        const mappedPositions = positionsList.map(p => ({ id: p.id, name: p.name }));
        setPositions(mappedPositions);
      } else {
        logDebug("No positions returned");
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  useEffect(() => {
    if (open) {
      const initializeData = async () => {
        setLoading(true);
        try {
          // Load positions first
          const { data: positionsList } = await contactPositionsService.getAll({
            order: { column: 'name', ascending: true }
          });
          
          if (positionsList) {
            const mappedPositions = positionsList.map(p => ({ id: p.id, name: p.name }));
            setPositions(mappedPositions);
          }
          
          // Then load contact data if editing
          if (contactId) {
            const contactData = await getContactById(contactId);
            if (contactData) {
              // Set position first to avoid flicker
              if (contactData.position_id) {
                setSelectedPosition(contactData.position_id);
              }

              // Then set form data
              setFormData({
                full_name: contactData.full_name || "",
                position: contactData.position_id || "",
                position_name: contactData.position || "",
                telephone: String(contactData.telephone || ""),
                mobile: String(contactData.mobile || ""),
                email: contactData.email || "",
                internal_telephone: contactData.internal_telephone || "",
                notes: contactData.notes || "",
              });
              
              setTelephone(String(contactData.telephone || ""));
              setMobile(String(contactData.mobile || ""));
            }
          } else {
            // Reset form for new contact
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
            setSelectedPosition(undefined);
          }
        } catch (error) {
          setError("Αδυναμία φόρτωσης δεδομένων");
        } finally {
          setLoading(false);
        }
      };
      
      initializeData();
      setError(null);
    } else {
      setPositionDialogOpen(false);
      setSelectedPosition(undefined);
    }
  }, [open, contactId]);

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

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.full_name?.trim()) {
        setError("Το πεδίο 'Ονοματεπώνυμο' είναι υποχρεωτικό");
        return;
      }

      const contactData = {
        id: contactId,
        customer_id: safeCustomerId,
        full_name: formData.full_name.trim(),
        position_id: selectedPosition || null,
        position: formData.position_name,
        telephone: String(formData.telephone || "").trim(),
        mobile: String(formData.mobile || "").trim(),
        email: formData.email?.trim(),
        internal_telephone: formData.internal_telephone?.trim(),
        notes: formData.notes?.trim(),
        status: 'active'
      };

      // Ensure phone numbers are treated as strings
      if (contactData.telephone) {
        contactData.telephone = String(contactData.telephone).trim();
      }
      if (contactData.mobile) {
        contactData.mobile = String(contactData.mobile).trim();
      }

      const { error: saveError } = contactId
        ? await updateContact(contactId, contactData)
        : await createContact(contactData);

      if (saveError) {
        setError("Σφάλμα κατά την αποθήκευση της επαφής");
        return;
      }

      if (refreshData) {
        refreshData();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving contact:", error);
      setError("Σφάλμα κατά την αποθήκευση της επαφής");
    } finally {
      setLoading(false);
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
        className="bg-[#2f3e46] text-[#cad2c5] border-0 outline-none p-0 max-w-5xl overflow-hidden"
        aria-labelledby="contact-dialog-title"
        aria-describedby="contact-dialog-description"
      >
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }} 
          className="flex flex-col h-full overflow-hidden bg-[#2f3e46]"
        >
          {/* Header */}
          <DialogHeader className="px-4 py-2 border-b border-[#52796f]">
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                        value={selectedPosition || ""}
                        onSelect={(value) => {
                          handlePositionChange(value);
                        }}
                        onEdit={handleEditPosition}
                        showEditButton={true}
                        placeholder="Επιλέξτε θέση..."
                        renderOption={(option): React.ReactNode => {
                          if (typeof option === 'object' && option.name) {
                            return option.name;
                          }
                          const pos = positions.find(p => p.id === option);
                          return pos ? pos.name : String(option);
                        }}
                        renderValue={(value): React.ReactNode => {
                          const pos = positions.find(p => p.id === value);
                          return pos ? pos.name : "";
                        }}
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
                
                <div className="bg-[#3a5258] p-2 rounded-b-md space-y-2 border border-[#52796f] border-t-0">
                  <div className="h-[70px] min-h-[70px]">
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="app-input w-full h-[70px] !min-h-[70px] bg-[#2f3e46] border-[#52796f] text-[#cad2c5] resize-none py-1 px-2"
                      placeholder="Προσθέστε σημειώσεις για την επαφή..."
                      rows={3}
                      style={{ minHeight: '70px !important', height: '70px !important' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[#52796f] mt-auto">
              {error && (
                <div className="mb-2 text-sm text-red-500 bg-red-100/10 px-3 py-2 rounded">
                  {error}
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#2f3e46] hover:bg-[#354f52] text-[#cad2c5] border border-[#52796f] min-w-[100px]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg 
                        className="animate-spin h-4 w-4 mr-2" 
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Αποθήκευση...
                    </div>
                  ) : (
                    "Αποθήκευση"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="bg-[#2f3e46] hover:bg-[#354f52] text-[#cad2c5] border border-[#52796f] min-w-[100px]"
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
