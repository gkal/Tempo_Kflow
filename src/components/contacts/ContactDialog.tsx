import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X, Star, Check } from "lucide-react";

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  contact?: any;
  customerId: string;
  onSave: () => void;
  onSetPrimary?: (contactId: string) => void;
  isPrimary?: boolean;
  viewOnly?: boolean;
  customerName?: string;
}

export default function ContactDialog({
  open,
  onClose,
  contact,
  customerId,
  onSave,
  onSetPrimary,
  isPrimary = false,
  viewOnly = false,
  customerName = "",
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

  const [positions, setPositions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [customerInfo, setCustomerInfo] = useState("");

  useEffect(() => {
    if (contact) {
      setFormData({
        full_name: contact.full_name || "",
        position: contact.position || "",
        telephone: contact.telephone || "",
        mobile: contact.mobile || "",
        email: contact.email || "",
        internal_telephone: contact.internal_telephone || "",
        notes: contact.notes || "",
      });
    } else {
      // Reset form when creating a new contact
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
    fetchPositions();
    fetchCustomerInfo();
    // Reset messages when dialog opens
    setError("");
    setSuccess(false);
  }, [contact, open, customerId]);

  const fetchCustomerInfo = async () => {
    if (!customerName && customerId) {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("company_name")
          .eq("id", customerId)
          .single();

        if (error) throw error;
        if (data) {
          setCustomerInfo(data.company_name);
        }
      } catch (error) {
        console.error("Σφάλμα κατά τη φόρτωση στοιχείων πελάτη:", error);
      }
    } else {
      setCustomerInfo(customerName);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_positions")
        .select("name")
        .order("name");

      if (error) throw error;
      setPositions(data.map((pos) => pos.name));
    } catch (error) {
      console.error("Σφάλμα κατά τη φόρτωση θέσεων:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePositionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      position: value,
    }));
  };

  const isFormValid = () => {
    return formData.full_name.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || viewOnly) return;

    setIsSubmitting(true);
    setError("");
    setSuccess(false);
    
    try {
      if (contact?.id) {
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
          .eq("id", contact.id);

        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase.from("contacts").insert({
          customer_id: customerId,
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
      onSave();
      
      // Show success message briefly
      setSuccess(true);
      
      // Close the dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (error: any) {
      console.error("Σφάλμα κατά την αποθήκευση επαφής:", error);
      setError(error.message || "Προέκυψε σφάλμα κατά την αποθήκευση της επαφής.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPrimary = () => {
    if (onSetPrimary && contact?.id) {
      onSetPrimary(contact.id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f] p-0 max-w-5xl"
        aria-describedby="contact-dialog-description"
      >
        <DialogHeader className="p-4 border-b border-[#52796f]">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold text-[#cad2c5]">
              {customerInfo && (
                <span className="text-[#84a98c] mr-2">{customerInfo} -</span>
              )}
              {contact ? "Επεξεργασία Επαφής" : "Νέα Επαφή"}
              {isPrimary && (
                <div className="flex items-center">
                  <span className="text-[#84a98c] text-sm mr-2">Κύρια Επαφή</span>
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              )}
              {viewOnly && (
                <span className="ml-2 text-[#84a98c] text-sm">(Προβολή)</span>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-[#cad2c5]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription id="contact-dialog-description" className="sr-only">
            {contact ? "Φόρμα επεξεργασίας επαφής" : "Φόρμα δημιουργίας νέας επαφής"}
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
                      disabled={viewOnly}
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
                      value={formData.mobile}
                      onChange={handleInputChange}
                      className="app-input w-full"
                      disabled={viewOnly}
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '20px' }}>
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
                      disabled={viewOnly}
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
                      placeholder="Επιλέξτε θέση"
                      disabled={viewOnly}
                      className="w-full"
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
                      value={formData.telephone}
                      onChange={handleInputChange}
                      className="app-input w-full"
                      disabled={viewOnly}
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '20px' }}>
                  <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                    Εσωτερικό
                  </div>
                  <div className="w-2/3">
                    <Input
                      id="internal_telephone"
                      name="internal_telephone"
                      value={formData.internal_telephone}
                      onChange={handleInputChange}
                      className="app-input w-full"
                      disabled={viewOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Group 3: Notes - Full width below the two columns */}
          <div className="px-8 pb-8">
            <div className="space-y-0">
              <div className="bg-[#3a5258] p-2 rounded-t-md border border-[#52796f] border-b-0">
                <h3 className="text-sm font-medium text-[#a8c5b5] uppercase tracking-wider border-b border-[#52796f] pb-1 -mx-2 px-2">ΣΗΜΕΙΩΣΕΙΣ</h3>
              </div>
              
              <div className="bg-[#3a5258] p-6 rounded-b-md border border-[#52796f] border-t-0">
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="contact-notes-textarea w-full"
                  disabled={viewOnly}
                  placeholder="Προσθέστε σημειώσεις..."
                />
              </div>
            </div>
          </div>

          {/* Error and Success Messages */}
          <div className="px-8 pb-4">
            {error && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 text-green-400 p-3 rounded-md mb-4">
                Η αποθήκευση ολοκληρώθηκε με επιτυχία!
              </div>
            )}
          </div>

          <div className="flex justify-between items-center p-4 border-t border-[#52796f]">
            {onSetPrimary && contact && !isPrimary ? (
              <Button
                type="button"
                onClick={handleSetPrimary}
                variant="outline"
                className="bg-transparent border-[#84a98c] text-[#84a98c] hover:bg-[#84a98c]/10"
              >
                <Star className="mr-2 h-4 w-4" />
                Ορισμός ως Κύρια
              </Button>
            ) : (
              <div></div>
            )}

            <div className="flex space-x-2">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#52796f]/20"
              >
                Ακύρωση
              </Button>
              {!viewOnly && (
                <Button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
                >
                  {isSubmitting ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  Αποθήκευση
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
