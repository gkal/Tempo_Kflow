import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X, Star } from "lucide-react";

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  contact?: any;
  customerId: string;
  onSave: () => void;
  onSetPrimary?: (contactId: string) => void;
  isPrimary?: boolean;
  viewOnly?: boolean;
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
}: ContactDialogProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    position: "",
    telephone: "",
    mobile: "",
    email: "",
    internal_telephone: "",
    notes: "",
    contact_type: "Επαγγελματική",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        contact_type: contact.contact_type || "Επαγγελματική",
      });
    } else {
      setFormData({
        full_name: "",
        position: "",
        telephone: "",
        mobile: "",
        email: "",
        internal_telephone: "",
        notes: "",
        contact_type: "Επαγγελματική",
      });
    }
    fetchPositions();
  }, [contact]);

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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const isFormValid = () => {
    return formData.full_name.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || viewOnly) return;

    setIsSubmitting(true);
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
            contact_type: formData.contact_type,
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
          contact_type: formData.contact_type,
        });

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Σφάλμα κατά την αποθήκευση επαφής:", error);
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
      <DialogContent className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] p-0 max-w-4xl">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-[#cad2c5]">
              {contact ? "Επεξεργασία Επαφής" : "Νέα Επαφή"}
            </DialogTitle>
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="h-4 w-4 text-[#84a98c]" />
              <span className="sr-only">Κλείσιμο</span>
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-0">
          {/* Two columns layout for the first two sections */}
          <div className="grid grid-cols-2 gap-6 p-6 pt-2">
            {/* Group 1: Basic Contact Information */}
            <div className="space-y-0">
              <div className="bg-[#354f52] p-2 rounded-t-md">
                <h3 className="text-sm font-medium text-[#cad2c5] uppercase tracking-wider">ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ</h3>
              </div>
              
              <div className="bg-[#354f52]/50 p-4 rounded-b-md space-y-4">
                <div className="grid grid-cols-[150px_1fr] items-center">
                  <label
                    htmlFor="full_name"
                    className="text-sm font-medium text-[#cad2c5]"
                  >
                    Ονοματεπώνυμο <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
                    disabled={viewOnly}
                    required
                  />
                </div>

                <div className="grid grid-cols-[150px_1fr] items-center">
                  <label
                    htmlFor="mobile"
                    className="text-sm font-medium text-[#cad2c5]"
                  >
                    Κινητό <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
                    disabled={viewOnly}
                    required
                  />
                </div>

                <div className="grid grid-cols-[150px_1fr] items-center">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-[#cad2c5]"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
                    disabled={viewOnly}
                  />
                </div>
              </div>
            </div>

            {/* Group 2: Professional Information */}
            <div className="space-y-0">
              <div className="bg-[#354f52] p-2 rounded-t-md">
                <h3 className="text-sm font-medium text-[#cad2c5] uppercase tracking-wider">ΕΠΑΓΓΕΛΜΑΤΙΚΑ ΣΤΟΙΧΕΙΑ</h3>
              </div>
              
              <div className="bg-[#354f52]/50 p-4 rounded-b-md space-y-4">
                <div className="grid grid-cols-[150px_1fr] items-center">
                  <label
                    htmlFor="position"
                    className="text-sm font-medium text-[#cad2c5]"
                  >
                    Θέση
                  </label>
                  <GlobalDropdown
                    options={positions}
                    value={formData.position}
                    onSelect={(value) =>
                      setFormData({ ...formData, position: value })
                    }
                    placeholder="Επιλέξτε θέση"
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-[150px_1fr] items-center">
                  <label
                    htmlFor="telephone"
                    className="text-sm font-medium text-[#cad2c5]"
                  >
                    Σταθερό Τηλέφωνο
                  </label>
                  <Input
                    id="telephone"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
                    disabled={viewOnly}
                  />
                </div>

                <div className="grid grid-cols-[150px_1fr] items-center">
                  <label
                    htmlFor="internal_telephone"
                    className="text-sm font-medium text-[#cad2c5]"
                  >
                    Εσωτερικό
                  </label>
                  <Input
                    id="internal_telephone"
                    name="internal_telephone"
                    value={formData.internal_telephone}
                    onChange={handleInputChange}
                    className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
                    disabled={viewOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group 3: Notes - Full width below the two columns */}
          <div className="px-6 pb-6">
            <div className="space-y-0">
              <div className="bg-[#354f52] p-2 rounded-t-md">
                <h3 className="text-sm font-medium text-[#cad2c5] uppercase tracking-wider">ΣΗΜΕΙΩΣΕΙΣ</h3>
              </div>
              
              <div className="bg-[#354f52]/50 p-4 rounded-b-md">
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] min-h-[100px] w-full"
                  disabled={viewOnly}
                  placeholder="Προσθέστε σημειώσεις..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 border-t border-[#52796f]/30 bg-[#2f3e46]">
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
