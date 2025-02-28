import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContactDialogProps {
  open: boolean;
  onClose: () => void;
  contact?: any;
  customerId: string;
  onSave: () => void;
}

export default function ContactDialog({
  open,
  onClose,
  contact,
  customerId,
  onSave,
}: ContactDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    telephone: "",
    internal_telephone: "",
    mobile: "",
    email: "",
    position: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        full_name: contact.full_name || "",
        telephone: contact.telephone || "",
        internal_telephone: contact.internal_telephone || "",
        mobile: contact.mobile || "",
        email: contact.email || "",
        position: contact.position || "",
        notes: contact.notes || "",
      });
    } else {
      setFormData({
        full_name: "",
        telephone: "",
        internal_telephone: "",
        mobile: "",
        email: "",
        position: "",
        notes: "",
      });
    }
    setError("");
    setSuccess(false);
  }, [contact, open]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isFormValid = () => {
    // Check mandatory fields - at minimum, full name is required
    return formData.full_name.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from("contacts")
          .update({
            ...formData,
            modified_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contact.id);

        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase.from("contacts").insert([
          {
            ...formData,
            customer_id: customerId,
            created_by: user?.id,
            modified_by: user?.id,
            status: "active",
          },
        ]);

        if (error) throw error;
      }

      setSuccess(true);
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error("Error saving contact:", error);
      setError(error.message || "Σφάλμα κατά την αποθήκευση");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#2f3e46] border-[#52796f] text-[#cad2c5]">
        <DialogHeader>
          <DialogTitle className="text-[#cad2c5]">
            {contact ? "Επεξεργασία Επαφής" : "Νέα Επαφή"}
          </DialogTitle>
          <DialogDescription className="text-[#84a98c]">
            {contact ? (
              <>
                <span className="font-bold text-lg">{contact.full_name}</span>
              </>
            ) : (
              "Συμπληρώστε τα στοιχεία της νέας επαφής"
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-[#84a98c]">
              Ονοματεπώνυμο <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="h-8 bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telephone" className="text-[#84a98c]">
                Τηλέφωνο
              </Label>
              <Input
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
                className="h-8 bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_telephone" className="text-[#84a98c]">
                Εσωτερικό Τηλέφωνο
              </Label>
              <Input
                id="internal_telephone"
                name="internal_telephone"
                value={formData.internal_telephone}
                onChange={handleInputChange}
                className="h-8 bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-[#84a98c]">
                Κινητό
              </Label>
              <Input
                id="mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                className="h-8 bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#84a98c]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="h-8 bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position" className="text-[#84a98c]">
              Θέση
            </Label>
            <Input
              id="position"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              className="h-8 bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#84a98c]">
              Σημειώσεις
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="bg-[#354f52] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c] min-h-[80px]"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-md flex items-center space-x-2">
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 text-green-400 p-3 rounded-md flex items-center space-x-2">
              <span>Η ενημέρωση ολοκληρώθηκε με επιτυχία!</span>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#52796f] text-[#cad2c5] hover:bg-[#52796f]/20"
            >
              Άκυρο
            </Button>
            <Button
              type="submit"
              disabled={loading || !isFormValid()}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
