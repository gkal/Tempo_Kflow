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
import { AlertCircle, CheckCircle } from "lucide-react";

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
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    full_name: "",
    telephone: "",
    internal_telephone: "",
    mobile: "",
    email: "",
    position: "",
    position_id: "",
    phone: "",
    notes: "",
  });

  const [positions, setPositions] = useState([
    { id: "default-1", name: "Διευθυντής" },
    { id: "default-2", name: "Υπάλληλος" },
    { id: "default-3", name: "Γραμματέας" },
    { id: "default-4", name: "Λογιστής" },
    { id: "default-5", name: "Τεχνικός" },
    { id: "default-6", name: "Πωλητής" },
    { id: "default-7", name: "Διαχειριστής" },
    { id: "default-8", name: "Σύμβουλος" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch positions from database
  const fetchPositions = async () => {
    try {
      // Try to fetch positions from the database
      const { data, error } = await supabase
        .from("contact_positions")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching positions:", error);
        // Keep using the default positions
      } else if (data && data.length > 0) {
        setPositions(data);
      }
      // If no data or empty array, keep using the default positions
    } catch (error) {
      console.error("Exception in fetchPositions:", error);
      // Keep using the default positions
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        full_name: contact.full_name || "",
        telephone: contact.telephone || contact.phone || "",
        internal_telephone: contact.internal_telephone || "",
        mobile: contact.mobile || "",
        email: contact.email || "",
        position: contact.position || "",
        position_id: contact.position_id || "",
        phone: contact.phone || "",
        notes: contact.notes || "",
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        full_name: "",
        telephone: "",
        internal_telephone: "",
        mobile: "",
        email: "",
        position: "",
        position_id: "",
        phone: "",
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
    return formData.first_name.trim() !== "" && formData.last_name.trim() !== "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Check if position exists or create a new one
      let positionId = formData.position_id;

      // If we have a position name but no ID, we need to create or find it
      if (formData.position && !positionId) {
        const positionName = formData.position;

        // First check if this position already exists
        const { data: existingPosition } = await supabase
          .from("contact_positions")
          .select("id")
          .eq("name", positionName)
          .maybeSingle();

        if (existingPosition) {
          // Use existing position
          positionId = existingPosition.id;
        } else {
          // Create new position
          const { data: newPositionData, error: positionError } = await supabase
            .from("contact_positions")
            .insert([{ name: positionName }])
            .select();

          if (positionError) throw positionError;
          if (newPositionData && newPositionData.length > 0) {
            positionId = newPositionData[0].id;
          }
        }
      }

      // Prepare contact data with position info
      const contactData = {
        ...formData,
        position_id: positionId,
      };

      if (contact) {
        // Update existing contact
        const { error } = await supabase
          .from("contacts")
          .update({
            ...contactData,
            modified_by: user?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contact.id);

        if (error) throw error;
      } else {
        // Create new contact
        const { data, error } = await supabase
          .from("contacts")
          .insert([
            {
              ...contactData,
              customer_id: customerId,
              created_by: user?.id,
              modified_by: user?.id,
              status: "active",
            },
          ])
          .select();

        if (error) throw error;

        // If this is the first contact, set it as primary automatically
        if (data && data.length > 0 && onSetPrimary) {
          const { count } = await supabase
            .from("contacts")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", customerId)
            .eq("status", "active");

          if (count === 1) {
            onSetPrimary(data[0].id);
          }
        }
      }

      // Refresh positions list
      fetchPositions();

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

  const handleSetPrimary = () => {
    if (contact && onSetPrimary) {
      onSetPrimary(contact.id);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handlePositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPosition = positions.find((p) => p.name === e.target.value);
    setFormData((prev) => ({
      ...prev,
      position: e.target.value,
      position_id: selectedPosition?.id || "",
    }));
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
                <span className="font-bold text-lg">{contact.first_name} {contact.last_name}</span>
                {isPrimary && (
                  <span className="ml-2 text-xs bg-[#52796f]/30 text-[#84a98c] px-1.5 py-0.5 rounded-full">
                    Κύρια επαφή
                  </span>
                )}
              </>
            ) : (
              "Συμπληρώστε τα στοιχεία της νέας επαφής"
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-[#84a98c]">
              Όνομα <span className="text-red-500">*</span>
            </Label>
            <Input
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              className="app-input"
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-[#84a98c]">
              Επώνυμο <span className="text-red-500">*</span>
            </Label>
            <Input
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              className="app-input"
              required
              autoComplete="off"
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
              className="app-input"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[#84a98c]">
              Τηλέφωνο
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="app-input"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-[#84a98c]">
              Κινητό
            </Label>
            <Input
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              className="app-input"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position" className="text-[#84a98c]">
              Θέση
            </Label>
            <div>
              {/* Simple HTML select with explicit styling */}
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handlePositionChange}
                className="w-full h-8 bg-[#354f52] border border-[#52796f] text-[#cad2c5] px-3 py-1 rounded-md"
                style={{
                  appearance: "menulist",
                  WebkitAppearance: "menulist",
                  MozAppearance: "menulist",
                  color: "#cad2c5",
                  backgroundColor: "#354f52",
                  borderColor: "#52796f",
                  height: "32px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  width: "100%",
                  outline: "none",
                  cursor: "pointer",
                  display: "block",
                  position: "relative",
                  zIndex: 10,
                }}
              >
                <option value="">-- Επιλέξτε θέση --</option>
                {positions.map((pos) => (
                  <option key={pos.id} value={pos.name}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#84a98c]">
              Σημειώσεις
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              style={{
                minHeight: '124px !important',
                height: '124px !important',
                maxHeight: '124px !important'
              }}
              data-notes-textarea="true"
              onChange={(e) => {
                handleInputChange(e);
              }}
              disabled={viewOnly}
              className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] placeholder:text-[#84a98c]/50"
              placeholder="Προσθέστε σημειώσεις για την επαφή..."
            />
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-md flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 text-green-400 p-3 rounded-md flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Η ενημέρωση ολοκληρώθηκε με επιτυχία!</span>
            </div>
          )}

          <div className="flex justify-between space-x-2">
            {contact && onSetPrimary && !isPrimary && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSetPrimary}
                className="border-[#84a98c] text-[#84a98c] hover:bg-[#52796f]/20 hover:text-[#cad2c5]"
              >
                Ορισμός ως κύρια
              </Button>
            )}
            <div
              className={`flex space-x-2 ${contact && onSetPrimary && !isPrimary ? "" : "ml-auto"}`}
            >
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
