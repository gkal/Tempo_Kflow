import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Search, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ContactDialog from "../contacts/ContactDialog";
import { Textarea } from "@/components/ui/textarea";
import { ContactList } from "@/components/contacts/ContactList";
import { Label } from "@/components/ui/label";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Custom styles for select dropdown
const selectStyles = `
  select {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    background-color: #2f3e46 !important;
    color: #cad2c5 !important;
    border: none !important;
    outline: none !important;
  }
  
  select:focus {
    box-shadow: 0 0 0 1px #52796f !important;
    border: none !important;
  }
  
  select:hover {
    box-shadow: 0 0 0 1px #52796f !important;
    border: none !important;
  }
  
  select option {
    background-color: #2f3e46 !important;
    color: #cad2c5 !important;
    border: none !important;
  }
  
  select option:checked,
  select option:hover,
  select option:focus {
    background-color: #52796f !important;
    color: #cad2c5 !important;
  }
`;

interface CustomerFormProps {
  customerId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  viewOnly?: boolean;
  onValidityChange?: (isValid: boolean) => void;
}

const CustomerForm = ({
  customerId: initialCustomerId,
  onSave,
  onCancel,
  viewOnly = false,
  onValidityChange,
}: CustomerFormProps) => {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tempCustomerType, setTempCustomerType] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    afm: "",
    doy: "",
    customer_type: "Εταιρεία",
    address: "",
    postal_code: "",
    town: "",
    telephone: "",
    email: "",
    webpage: "",
    fax_number: "",
    notes: "",
    primary_contact_id: "",
  });

  const [contacts, setContacts] = useState([]);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  // No longer needed as we're using primary_contact_id in formData
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch customer data if editing
  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
      fetchContacts();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select(
          `*, created_by:users!created_by(fullname), modified_by:users!modified_by(fullname)`,
        )
        .eq("id", customerId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          company_name: data.company_name || "",
          afm: data.afm || "",
          doy: data.doy || "",
          customer_type: data.customer_type || "Εταιρεία",
          address: data.address || "",
          postal_code: data.postal_code || "",
          town: data.town || "",
          telephone: data.telephone || "",
          email: data.email || "",
          webpage: data.webpage || "",
          fax_number: data.fax_number || "",
          notes: data.notes || "",
          primary_contact_id: data.primary_contact_id || "",
        });
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
      setError("Σφάλμα κατά την ανάκτηση δεδομένων πελάτη");
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("customer_id", customerId)
        .eq("status", "active");

      if (error) throw error;
      setContacts(data || []);

      // Get the customer's primary contact ID
      const { data: customerData } = await supabase
        .from("customers")
        .select("primary_contact_id")
        .eq("id", customerId)
        .single();

      if (customerData && customerData.primary_contact_id) {
        setFormData((prev) => ({
          ...prev,
          primary_contact_id: customerData.primary_contact_id,
        }));
      } else if (data && data.length > 0) {
        // If no primary contact is set but contacts exist, set the first one as primary
        await setPrimaryContact(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  // Primary contact management
  const setPrimaryContact = async (contactId: string) => {
    if (!customerId) return;

    try {
      // Update customer with primary contact
      const { error } = await supabase
        .from("customers")
        .update({
          primary_contact_id: contactId,
          modified_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);

      if (error) throw error;

      // Refresh contacts to show updated primary status
      await fetchContacts();
    } catch (error) {
      console.error("Error setting primary contact:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    
    // If this is a customer_type change from the dropdown, store it in temp state
    if (name === "customer_type" && tempCustomerType !== null) {
      // Use the temp value that was set by the dropdown
      setFormData((prev) => ({
        ...prev,
        customer_type: tempCustomerType,
      }));
      // Reset the temp value
      setTempCustomerType(null);
    } else {
      // For all other fields, update normally
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const isFormValid = () => {
    // Check mandatory fields
    return (
      formData.company_name.trim() !== "" && formData.telephone.trim() !== ""
    );
  };

  // Update parent component about form validity whenever form data changes
  useEffect(() => {
    if (onValidityChange) {
      onValidityChange(isFormValid());
    }
  }, [formData, onValidityChange]);

  const [saveDisabled, setSaveDisabled] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there's a temporary customer type, apply it now
    if (tempCustomerType !== null) {
      setFormData(prev => ({
        ...prev,
        customer_type: tempCustomerType
      }));
      setTempCustomerType(null);
    }
    
    // Get all required inputs
    const form = e.currentTarget as HTMLFormElement;
    const requiredInputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    // Check if any required fields are empty
    let isValid = true;
    requiredInputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!element.value) {
        isValid = false;
        
        // Show custom Greek validation message
        alert('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
        
        // Focus the first empty required field
        element.focus();
        
        // Stop checking after finding the first empty field
        return;
      }
    });
    
    if (!isValid) {
      return;
    }
    
    // Continue with form submission
    setLoading(true);
    setError("");
    setSuccess(false);
    
    try {
      if (customerId) {
        // Update existing customer
        const { error } = await supabase
          .from("customers")
          .update({
            ...formData,
            modified_by: user?.id,
            updated_at: new Date().toISOString(),
            primary_contact_id: formData.primary_contact_id || null,
          })
          .eq("id", customerId);

        if (error) throw error;
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from("customers")
          .insert([{
            ...formData,
            created_by: user?.id,
            modified_by: user?.id,
            status: "active",
            primary_contact_id: null, // Explicitly set to null for new customers
          }])
          .select();

        if (error) throw error;

        // Set the customerId to the newly created customer's ID
        if (data && data.length > 0) {
          const newCustomerId = data[0].id;
          setCustomerId(newCustomerId);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (onSave) onSave(); // Call onSave to refresh the customer list
      }, 1000);
    } catch (error: any) {
      console.error("Error saving customer:", error);
      setError(error.message || "Σφάλμα κατά την αποθήκευση");
    } finally {
      setLoading(false);
    }
  };

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    setShowContactDialog(true);
  };

  return (
    <div className="h-full overflow-auto bg-[#2f3e46] text-[#cad2c5]">
      <style>{selectStyles}</style>
      <form
        id="customer-form"
        className="p-4 bg-[#2f3e46] text-[#cad2c5]"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        {/* Hidden save button that can be triggered from parent */}
        <button 
          id="save-customer-form" 
          type="submit" 
          style={{ display: 'none' }}
        >
          Save
        </button>
        
        {/* Form Sections */}
        <div className="space-y-4 max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Account Information Section */}
            <div className="w-full md:w-1/2 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
              <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ
                </h2>
              </div>
              <div className="p-3">
                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">
                    Επωνυμία <span className="text-red-500">*</span>
                  </div>
                  <div className="w-2/3">
                    <Input
                      id="company_name"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly}
                      required
                      autoComplete="off"
                      onInvalid={(e) => e.currentTarget.setCustomValidity('Παρακαλώ συμπληρώστε αυτό το πεδίο')}
                      onInput={(e) => e.currentTarget.setCustomValidity('')}
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">
                    Τηλέφωνο <span className="text-red-500">*</span>
                  </div>
                  <div className="w-2/3">
                    <Input
                      id="telephone"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly}
                      required
                      autoComplete="off"
                      onInvalid={(e) => e.currentTarget.setCustomValidity('Παρακαλώ συμπληρώστε αυτό το πεδίο')}
                      onInput={(e) => e.currentTarget.setCustomValidity('')}
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">ΑΦΜ</div>
                  <div className="w-2/3">
                    <Input
                      id="afm"
                      name="afm"
                      value={formData.afm}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Δ.Ο.Υ.</div>
                  <div className="w-2/3">
                    <Input
                      id="doy"
                      name="doy"
                      value={formData.doy}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">
                    Τύπος Πελάτη
                  </div>
                  <div className="w-2/3">
                    <GlobalDropdown
                      options={["Εταιρεία", "Ιδιώτης", "Δημόσιο", "Οικοδομές"]}
                      value={formData.customer_type}
                      onSelect={(value) => {
                        setTempCustomerType(value);
                      }}
                      placeholder="Επιλέξτε τύπο πελάτη"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '0' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Email</div>
                  <div className="w-2/3">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Company Contacts Section */}
            <div className="w-full md:w-1/2 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden h-[350px]">
              <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f] flex justify-between items-center">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΕΠΑΦΕΣ ΕΤΑΙΡΕΙΑΣ
                </h2>
                {customerId && (
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="h-7 text-[#a8c5b5] hover:text-[#cad2c5] hover:bg-[#2f3e46] flex items-center text-sm px-2 rounded"
                      onClick={() => {
                        // Open contact selection dialog or dropdown
                      }}
                      disabled={viewOnly || contacts.length === 0}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Επιλογή
                    </button>
                    <button
                      type="button"
                      className="h-7 w-7 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3e46] border border-yellow-600 rounded-full flex items-center justify-center"
                      onClick={() => {
                        setSelectedContact(null);
                        setShowContactDialog(true);
                      }}
                      disabled={viewOnly}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-3">
                {customerId ? (
                  <ContactList
                    contacts={contacts}
                    primaryContactId={formData.primary_contact_id}
                    onContactClick={handleContactClick}
                    onAddContact={() => {
                      setSelectedContact(null);
                      setShowContactDialog(true);
                    }}
                    onSetPrimary={setPrimaryContact}
                    maxHeight="max-h-[200px]"
                  />
                ) : (
                  <div className="text-center py-3 text-[#a8c5b5]">
                    Αποθηκεύστε πρώτα τον πελάτη για να προσθέσετε επαφές.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Address Section */}
            <div className="w-full md:w-1/2 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
              <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΣΤΟΙΧΕΙΑ ΔΙΕΥΘΥΝΣΕΩΣ
                </h2>
              </div>
              <div className="p-3">
                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Οδός</div>
                  <div className="w-3/4">
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '16px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Πόλη</div>
                  <div className="w-3/4">
                    <Input
                      id="town"
                      name="town"
                      value={formData.town}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '0' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Τ.Κ.</div>
                  <div className="w-3/4">
                    <Input
                      id="postal_code"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="w-full md:w-1/2 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
              <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΣΗΜΕΙΩΣΕΙΣ
                </h2>
              </div>
              <div className="p-3">
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  className="customer-notes-textarea bg-[#2f3e46] text-[#cad2c5] placeholder:text-[#84a98c]/50"
                  style={{
                    minHeight: '124px !important',
                    height: '124px !important',
                    maxHeight: '124px !important',
                    resize: 'none',
                    border: 'none'
                  }}
                  data-notes-textarea="true"
                  onChange={(e) => {
                    handleInputChange(e);
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 1px #52796f';
                  }}
                  onMouseOut={(e) => {
                    if (document.activeElement !== e.currentTarget) {
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  disabled={viewOnly}
                  placeholder="Προσθέστε σημειώσεις για τον πελάτη..."
                />
              </div>
            </div>
          </div>

          {/* Error and Success Messages */}
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
      </form>

      {/* Contact Dialog */}
      {customerId && (
        <ContactDialog
          open={showContactDialog}
          onClose={() => {
            setShowContactDialog(false);
            setSelectedContact(null);
          }}
          contact={selectedContact}
          customerId={customerId}
          isPrimary={selectedContact?.id === formData.primary_contact_id}
          onSetPrimary={setPrimaryContact}
          onSave={() => {
            fetchContacts();
          }}
        />
      )}
    </div>
  );
};

export default CustomerForm;

