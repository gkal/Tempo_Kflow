import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { Check, X, Plus } from "lucide-react";
import ContactDialog from "@/components/contacts/ContactDialog";

interface OffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: () => void;
  defaultSource?: string;
}

export default function OffersDialog({
  open,
  onOpenChange,
  customerId,
  offerId,
  onSave,
  defaultSource = "Email",
}: OffersDialogProps) {
  // Add global style for placeholder
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      #requirements::placeholder, #amount::placeholder, #customer_comments::placeholder, #our_comments::placeholder {
        color: #5d7a63 !important;
        opacity: 1 !important;
        font-size: 0.875rem !important;
      }
      
      #requirements, #amount, #customer_comments, #our_comments {
        font-size: 0.875rem !important; /* Smaller text size */
        line-height: 1.5 !important;
        resize: none !important;
        vertical-align: top !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
        box-sizing: border-box !important;
      }
      
      #requirements, #amount {
        height: 75px !important;
        min-height: 75px !important;
        max-height: 75px !important;
      }
      
      #customer_comments, #our_comments {
        height: 60px !important;
        min-height: 60px !important;
        max-height: 60px !important;
      }
      
      /* Hover effects for inputs and textareas */
      input:hover, textarea:hover, select:hover {
        box-shadow: 0 0 0 1px #52796f !important;
      }
      
      input:focus, textarea:focus, select:focus {
        box-shadow: 0 0 0 2px #52796f !important;
        outline: none !important;
      }
      
      /* Custom styling for date picker */
      input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        filter: invert(0.8) sepia(0.3) saturate(0.5) hue-rotate(100deg);
        opacity: 0.8;
      }
      
      /* Override browser's default selection color */
      input[type="datetime-local"] {
        color-scheme: dark;
      }
      
      /* Custom selection colors for the date picker */
      ::-moz-selection {
        background-color: #52796f !important;
        color: #cad2c5 !important;
      }
      
      ::selection {
        background-color: #52796f !important;
        color: #cad2c5 !important;
      }
      
      /* Force green highlight for date picker */
      input[type="datetime-local"]::-webkit-datetime-edit-fields-wrapper {
        background-color: transparent !important;
      }
      
      input[type="datetime-local"]::-webkit-datetime-edit-text,
      input[type="datetime-local"]::-webkit-datetime-edit-month-field,
      input[type="datetime-local"]::-webkit-datetime-edit-day-field,
      input[type="datetime-local"]::-webkit-datetime-edit-year-field,
      input[type="datetime-local"]::-webkit-datetime-edit-hour-field,
      input[type="datetime-local"]::-webkit-datetime-edit-minute-field,
      input[type="datetime-local"]::-webkit-datetime-edit-ampm-field {
        color: #cad2c5 !important;
      }
      
      input[type="datetime-local"]::-webkit-datetime-edit-text:focus,
      input[type="datetime-local"]::-webkit-datetime-edit-month-field:focus,
      input[type="datetime-local"]::-webkit-datetime-edit-day-field:focus,
      input[type="datetime-local"]::-webkit-datetime-edit-year-field:focus,
      input[type="datetime-local"]::-webkit-datetime-edit-hour-field:focus,
      input[type="datetime-local"]::-webkit-datetime-edit-minute-field:focus,
      input[type="datetime-local"]::-webkit-datetime-edit-ampm-field:focus {
        background-color: #52796f !important;
        color: #cad2c5 !important;
      }
      
      /* Adjust section heights */
      .bg-\\[\\#3a5258\\].px-4.py-2 {
        padding-top: 0.375rem !important;
        padding-bottom: 0.375rem !important;
      }
      
      /* Force equal heights for sections */
      .section-basic-info, .section-requirements {
        height: 180px !important;
      }
      
      /* Make dropdown headers match input height */
      .dropdown-header {
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px !important;
        display: flex !important;
        align-items: center !important;
        font-size: 0.9rem !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [customerName, setCustomerName] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactOptions, setContactOptions] = useState<string[]>([]);
  const [contactMap, setContactMap] = useState<Record<string, string>>({});
  const [contactDisplayMap, setContactDisplayMap] = useState<Record<string, string>>({});
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Format current date and time in ISO format for datetime-local input
  const formatCurrentDateTimeForInput = () => {
    const now = new Date();
    // Format with timezone offset for Greece (UTC+3)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [currentDate, setCurrentDate] = useState(formatCurrentDateTimeForInput());
  
  // Status and result options with display text
  const sourceOptions = [
    { value: "Email", label: "Email" },
    { value: "Phone", label: "Τηλέφωνο" },
    { value: "Site", label: "Site" },
    { value: "Physical", label: "Φυσική Παρουσία" }
  ];
  
  const statusOptions = [
    { value: "wait_for_our_answer", label: "Αναμονή για απάντησή μας" },
    { value: "wait_for_customer_answer", label: "Αναμονή για απάντηση πελάτη" },
    { value: "ready", label: "Ολοκληρώθηκε" }
  ];
  
  const resultOptions = [
    { value: "none", label: "Επιλέξτε..." },
    { value: "success", label: "Επιτυχία" },
    { value: "failed", label: "Αποτυχία" },
    { value: "cancel", label: "Ακύρωση" }
  ];

  // Helper functions for source
  const getSourceLabel = (value: string) => {
    return sourceOptions.find(option => option.value === value)?.label || value;
  };
  
  const getSourceValue = (label: string) => {
    return sourceOptions.find(option => option.label === label)?.value || label;
  };

  // Helper functions for status and result
  const getStatusLabel = (value: string) => {
    return statusOptions.find(option => option.value === value)?.label || value;
  };
  
  const getStatusValue = (label: string) => {
    return statusOptions.find(option => option.label === label)?.value || label;
  };
  
  const getResultLabel = (value: string) => {
    return resultOptions.find(option => option.value === value)?.label || value;
  };
  
  const getResultValue = (label: string) => {
    return resultOptions.find(option => option.label === label)?.value || label;
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      source: defaultSource,
      requirements: "",
      amount: "",
      customer_comments: "",
      our_comments: "",
      offer_result: "wait_for_our_answer",
      result: "none",
      assigned_to: user?.id || "",
      address: "",
      tk: "",
      town: "",
      hma: false,
      certificate: "",
      offer_date: currentDate,
    },
  });
  
  // Update source when defaultSource changes
  useEffect(() => {
    setValue("source", defaultSource);
  }, [defaultSource, setValue]);

  // Reset success and error states when dialog opens or closes
  useEffect(() => {
    if (open) {
      // Reset states when dialog opens
      setError("");
      setSuccess(false);
    }
  }, [open]);

  // Update current date/time when dialog opens
  useEffect(() => {
    if (open && !offerId) {
      const newDate = formatCurrentDateTimeForInput();
      setCurrentDate(newDate);
      setValue("offer_date", newDate);
    }
  }, [open, offerId, setValue]);

  // Fetch users for assignment dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, fullname")
          .eq("status", "active");

        if (error) throw error;
        
        // Create a map of user IDs to names
        const userIdToName: Record<string, string> = {};
        const userNameOptions: string[] = [];
        
        data?.forEach(user => {
          userIdToName[user.id] = user.fullname;
          userNameOptions.push(user.fullname);
        });
        
        setUserMap(userIdToName);
        setUserOptions(userNameOptions);
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Helper function to convert between user ID and name
  const getUserIdByName = (name: string) => {
    const user = users.find(u => u.fullname === name);
    return user?.id || "";
  };

  const getUserNameById = (id: string) => {
    return userMap[id] || "";
  };

  // Fetch customer data including address
  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("company_name, address, postal_code, town")
          .eq("id", customerId)
          .single();

        if (error) throw error;
        
        if (data) {
          // Set customer name
          if (data.company_name) {
            setCustomerName(data.company_name);
          }
          
          // Set address fields if not editing an existing offer
          if (!offerId) {
            setValue("address", data.address || "");
            setValue("tk", data.postal_code || "");
            setValue("town", data.town || "");
          }
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };

    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId, offerId, setValue]);

  // Fetch offer data if editing
  useEffect(() => {
    if (offerId) {
      setIsEditing(true);
      const fetchOffer = async () => {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from("offers")
            .select("*")
            .eq("id", offerId)
            .single();

          if (error) throw error;

          // Set form values
          if (data) {
            setValue("source", data.source);
            setValue("requirements", data.requirements || "");
            setValue("amount", data.amount || "");
            setValue("customer_comments", data.customer_comments || "");
            setValue("our_comments", data.our_comments || "");
            setValue("offer_result", data.offer_result || "wait_for_our_answer");
            setValue("result", data.result || "none");
            // For assigned_to, we store the ID but display the name
            setValue("assigned_to", data.assigned_to || user?.id || "");
            setValue("address", data.address || "");
            setValue("tk", data.tk || "");
            setValue("town", data.town || "");
            setValue("hma", data.hma || false);
            setValue("certificate", data.certificate || "");
            
            // Set the contact ID if available
            if (data.contact_id) {
              setSelectedContactId(data.contact_id);
            }
            
            // Format date for datetime-local input
            if (data.created_at) {
              const date = new Date(data.created_at);
              setValue("offer_date", date.toISOString().slice(0, 16)); // Format as YYYY-MM-DDThh:mm
            } else {
              setValue("offer_date", currentDate);
            }
          }
        } catch (error) {
          console.error("Error fetching offer:", error);
          toast({
            title: "Σφάλμα",
            description: "Δεν ήταν δυνατή η φόρτωση των δεδομένων της προσφοράς.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      fetchOffer();
    } else {
      setIsEditing(false);
      reset({
        source: defaultSource,
        requirements: "",
        amount: "",
        customer_comments: "",
        our_comments: "",
        offer_result: "wait_for_our_answer",
        result: "none",
        assigned_to: user?.id || "",
        address: "",
        tk: "",
        town: "",
        hma: false,
        certificate: "",
        offer_date: currentDate,
      });
    }
  }, [offerId, open, defaultSource, currentDate, reset, setValue, user?.id]);

  // Fetch customer contacts
  useEffect(() => {
    const fetchContacts = async () => {
      if (!customerId) return;
      
      try {
        const { data, error } = await supabase
          .from("contacts")
          .select("id, full_name, position, created_at")
          .eq("customer_id", customerId)
          .eq("status", "active");

        if (error) throw error;
        
        // Create a map of contact IDs to names and display names
        const contactIdToName: Record<string, string> = {};
        const contactIdToDisplayName: Record<string, string> = {};
        const contactNameOptions: string[] = [];
        
        data?.forEach(contact => {
          // Store both full name and display name with position
          contactIdToName[contact.id] = contact.full_name;
          
          const displayName = contact.position 
            ? `${contact.full_name} (${contact.position})` 
            : contact.full_name;
          
          contactIdToDisplayName[contact.id] = displayName;
          contactNameOptions.push(displayName);
        });
        
        setContactMap(contactIdToName);
        setContactDisplayMap(contactIdToDisplayName);
        setContactOptions(contactNameOptions);
        setContacts(data || []);
        
        // If we have contacts and no contact is selected, select the first one
        if (data && data.length > 0 && !selectedContactId) {
          setSelectedContactId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    if (open) {
      fetchContacts();
    }
  }, [customerId, open, selectedContactId]);

  // Helper functions for contacts
  const getContactIdByName = (name: string) => {
    // Find the contact ID by the display name (which includes position)
    const contactEntry = Object.entries(contactDisplayMap).find(([_, value]) => value === name);
    return contactEntry ? contactEntry[0] : "";
  };

  const getContactNameById = (id: string) => {
    // Return just the full name for the selected value in the dropdown header
    return contactMap[id] || "";
  };
  
  const getContactDisplayNameById = (id: string) => {
    // Return the display name with position for the dropdown options
    return contactDisplayMap[id] || "";
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      // Convert 'none' result value to null
      const resultValue = data.result === 'none' ? null : data.result;
      
      // Prepare the data object
      const offerData = {
        source: data.source,
        requirements: data.requirements,
        amount: data.amount,
        customer_comments: data.customer_comments,
        our_comments: data.our_comments,
        offer_result: data.offer_result,
        result: resultValue,
        assigned_to: data.assigned_to,
        address: data.address,
        tk: data.tk,
        town: data.town,
        hma: data.hma,
        certificate: data.certificate,
        updated_at: new Date().toISOString(),
        created_at: data.offer_date ? new Date(data.offer_date).toISOString() : new Date().toISOString(),
        contact_id: selectedContactId,
      };

      if (isEditing) {
        // Update existing offer
        const { error } = await supabase
          .from("offers")
          .update(offerData)
          .eq("id", offerId);

        if (error) throw error;

        toast({
          title: "Επιτυχής ενημέρωση",
          description: "Η προσφορά ενημερώθηκε με επιτυχία.",
        });
        
        setSuccess(true);
        
        // Call onSave callback
        if (onSave) {
          onSave();
        }
        
        // Close dialog after successful save (same as for new offers)
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      } else {
        // Create new offer
        const { error } = await supabase
          .from("offers")
          .insert({
            ...offerData,
            customer_id: customerId,
            created_by: user?.id,
          });

        if (error) throw error;

        toast({
          title: "Επιτυχής δημιουργία",
          description: "Η προσφορά δημιουργήθηκε με επιτυχία.",
        });
        
        setSuccess(true);
        
        // Reset form
        reset({
          source: defaultSource,
          requirements: "",
          amount: "",
          customer_comments: "",
          our_comments: "",
          offer_result: "wait_for_our_answer",
          result: "none",
          assigned_to: user?.id || "",
          address: "",
          tk: "",
          town: "",
          hma: false,
          certificate: "",
          offer_date: formatCurrentDateTimeForInput(),
        });

        // Call onSave callback
        if (onSave) {
          onSave();
        }
        
        // Close dialog after successful save
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Error saving offer:", error);
      setError("Σφάλμα κατά την αποθήκευση της προσφοράς. Παρακαλώ δοκιμάστε ξανά.");
      toast({
        title: "Σφάλμα",
        description: "Δεν ήταν δυνατή η αποθήκευση της προσφοράς.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const watchOfferResult = watch("offer_result");
  const watchResult = watch("result");
  const watchHma = watch("hma");
  
  // Determine if the form is valid for submission
  const isFormValid = () => {
    // If status is "ready", a result must be selected
    if (watchOfferResult === "ready" && (watchResult === "none" || !watchResult)) {
      return false;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[1000px] bg-[#2f3e46] border-[#52796f] text-[#cad2c5] p-0 overflow-hidden" 
        aria-describedby="offer-dialog-description"
      >
        <DialogHeader className="p-4 border-b border-[#52796f] bg-[#3a5258]">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
              <div className="text-[#a8c5b5] text-base font-medium mr-2">
                {customerName}
              </div>
              <DialogTitle className="text-[#cad2c5] text-base cursor-default">
                {isEditing ? "Επεξεργασία Προσφοράς" : "Νέα Προσφορά"}
              </DialogTitle>
            </div>
            <div>
              {/* Empty div to maintain layout */}
            </div>
          </div>
          <div className="flex justify-center items-center mt-2 space-x-6">
            <div className="flex items-center">
              <div className="text-[#a8c5b5] text-sm mr-2">
                Ημερομηνία:
              </div>
              <Input
                type="datetime-local"
                value={watch("offer_date")}
                onChange={(e) => setValue("offer_date", e.target.value)}
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] h-8 w-48 hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none"
              />
            </div>
            
            <div className="flex items-center">
              <div className="text-[#a8c5b5] text-sm mr-2">
                Επαφή:
              </div>
              <div className="w-56 flex items-center">
                <div className="flex-1">
                  <GlobalDropdown
                    options={contactOptions}
                    value={getContactNameById(selectedContactId || "")}
                    onSelect={(name) => setSelectedContactId(getContactIdByName(name))}
                    placeholder="Επιλέξτε επαφή"
                    className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
                    disabled={contacts.length === 0}
                  />
                </div>
                <button
                  type="button"
                  className="h-7 w-7 p-0 ml-2 text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3e46] border border-yellow-600 rounded-full flex items-center justify-center"
                  onClick={() => {
                    setSelectedContact(null);
                    setShowContactDialog(true);
                  }}
                  title="Προσθήκη Επαφής"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <DialogDescription id="offer-dialog-description" className="sr-only">
            {isEditing ? "Φόρμα επεξεργασίας προσφοράς" : "Φόρμα δημιουργίας νέας προσφοράς"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 flex flex-col">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Basic Information Section */}
              <div className="section-basic-info bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                  <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                    ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
                  </h2>
                </div>
                <div className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                        Πηγή Αιτήματος
                      </div>
                      <div className="w-2/3">
                        <div className="w-3/4">
                          <GlobalDropdown
                            options={sourceOptions.map(option => option.label)}
                            value={getSourceLabel(watch("source"))}
                            onSelect={(label) => setValue("source", getSourceValue(label))}
                            placeholder="Επιλέξτε πηγή"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1 pt-2">
                        Ζήτηση
                      </div>
                      <div className="w-2/3">
                        <textarea
                          id="amount"
                          className="w-full bg-[#2f3e46] text-[#cad2c5] p-2 rounded-sm"
                          style={{
                            border: '1px solid #52796f',
                            outline: 'none',
                            fontSize: '0.875rem'
                          }}
                          placeholder="Ζήτηση πελάτη"
                          rows={3}
                          {...register("amount")}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                  <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                    ΔΙΕΥΘΥΝΣΗ ΠΑΡΑΛΑΒΗΣ
                  </h2>
                </div>
                <div className="p-3">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                        Διεύθυνση
                      </div>
                      <div className="w-2/3">
                        <Input
                          id="address"
                          className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
                          {...register("address")}
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                        Τ.Κ.
                      </div>
                      <div className="w-2/3">
                        <Input
                          id="tk"
                          className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
                          {...register("tk")}
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                        Πόλη
                      </div>
                      <div className="w-2/3">
                        <Input
                          id="town"
                          className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
                          {...register("town")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Requirements Section */}
              <div className="section-requirements bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                  <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                    ΑΠΑΙΤΗΣΕΙΣ
                  </h2>
                </div>
                <div className="p-3 space-y-3">
                  <div className="flex items-start">
                    <div className="w-1/6 text-[#a8c5b5] text-sm pr-1 pt-2">
                      Απαιτήσεις
                    </div>
                    <div className="w-5/6">
                      <textarea
                        id="requirements"
                        className="w-full bg-[#2f3e46] text-[#cad2c5] p-2 rounded-sm"
                        style={{
                          border: '1px solid #52796f',
                          outline: 'none',
                          fontSize: '0.875rem'
                        }}
                        placeholder="Απαιτήσεις του πελάτη προς εμάς"
                        rows={3}
                        {...register("requirements")}
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                        ΗΜΑ
                      </div>
                      <div className="w-2/3 flex items-center">
                        <div className="relative flex items-center">
                          <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out bg-[#354f52] border border-[#52796f]`}>
                            <div 
                              className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
                                watchHma 
                                  ? 'transform translate-x-7 bg-[#52796f]' 
                                  : 'transform translate-x-1 bg-gray-500'
                              }`}
                            ></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setValue("hma", !watchHma)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          ></button>
                          <span className="ml-2 text-sm">
                            {watchHma ? 'Ναι' : 'Όχι'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-1/2 text-[#a8c5b5] text-sm pr-1">
                        Πιστοποιητικό
                      </div>
                      <div className="w-1/2">
                        <Input
                          id="certificate"
                          className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
                          {...register("certificate")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
                <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                  <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                    ΚΑΤΑΣΤΑΣΗ & ΑΝΑΘΕΣΗ
                  </h2>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                        Κατάσταση
                      </div>
                      <div className="w-2/3">
                        <GlobalDropdown
                          options={statusOptions.map(option => option.label)}
                          value={getStatusLabel(watch("offer_result"))}
                          onSelect={(label) => setValue("offer_result", getStatusValue(label))}
                          placeholder="Επιλέξτε κατάσταση"
                          className="dropdown-header"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                        Ανάθεση σε
                      </div>
                      <div className="w-2/3">
                        <GlobalDropdown
                          options={userOptions}
                          value={getUserNameById(watch("assigned_to") || "")}
                          onSelect={(value) => setValue("assigned_to", getUserIdByName(value))}
                          placeholder="Επιλέξτε χρήστη"
                          className="dropdown-header"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
                        Αποτέλεσμα
                      </div>
                      <div className="w-2/3">
                        <GlobalDropdown
                          options={resultOptions.map(option => option.label)}
                          value={getResultLabel(watch("result") || "none")}
                          onSelect={(label) => setValue("result", getResultValue(label))}
                          placeholder="Επιλέξτε αποτέλεσμα"
                          disabled={watchOfferResult !== "ready"}
                          className="dropdown-header"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section - Full Width */}
          <div className="mt-4">
            <div className="bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
              <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΣΧΟΛΙΑ
                </h2>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[#a8c5b5] text-sm mb-1">
                      Σχόλια Πελάτη
                    </div>
                    <textarea
                      id="customer_comments"
                      className="w-full bg-[#2f3e46] text-[#cad2c5] p-2 rounded-sm"
                      style={{
                        border: '1px solid #52796f',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Σχόλια πελάτη..."
                      rows={3}
                      {...register("customer_comments")}
                    ></textarea>
                  </div>

                  <div>
                    <div className="text-[#a8c5b5] text-sm mb-1">
                      Δικά μας Σχόλια
                    </div>
                    <textarea
                      id="our_comments"
                      className="w-full bg-[#2f3e46] text-[#cad2c5] p-2 rounded-sm"
                      style={{
                        border: '1px solid #52796f',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Δικά μας σχόλια..."
                      rows={3}
                      {...register("our_comments")}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-between">
            <div className="flex-1 mr-4">
              {error && (
                <div className="bg-red-500/10 text-red-400 p-2 rounded-md text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-500/10 text-green-400 p-2 rounded-md text-sm">
                  Η αποθήκευση ολοκληρώθηκε με επιτυχία!
                </div>
              )}
              {watchOfferResult === "ready" && (watchResult === "none" || !watchResult) && !error && !success && (
                <div className="bg-yellow-500/10 text-yellow-400 p-2 rounded-md text-sm">
                  Όταν η κατάσταση είναι "Ολοκληρώθηκε", πρέπει να επιλέξετε ένα αποτέλεσμα.
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={loading || !isFormValid()}
                className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
              >
                {isEditing ? "Ενημέρωση" : "Αποθήκευση"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
              >
                Ακύρωση
              </Button>
            </div>
          </DialogFooter>
        </form>

        {/* Contact Dialog */}
        <ContactDialog
          open={showContactDialog}
          onClose={() => {
            setShowContactDialog(false);
            setSelectedContact(null);
            // Refresh contacts when dialog closes
            const fetchContacts = async () => {
              if (!customerId) return;
              
              try {
                const { data, error } = await supabase
                  .from("contacts")
                  .select("id, full_name, position, created_at")
                  .eq("customer_id", customerId)
                  .eq("status", "active");

                if (error) throw error;
                
                // Create a map of contact IDs to names and display names
                const contactIdToName: Record<string, string> = {};
                const contactIdToDisplayName: Record<string, string> = {};
                const contactNameOptions: string[] = [];
                
                data?.forEach(contact => {
                  // Store both full name and display name with position
                  contactIdToName[contact.id] = contact.full_name;
                  
                  const displayName = contact.position 
                    ? `${contact.full_name} (${contact.position})` 
                    : contact.full_name;
                  
                  contactIdToDisplayName[contact.id] = displayName;
                  contactNameOptions.push(displayName);
                });
                
                setContactMap(contactIdToName);
                setContactDisplayMap(contactIdToDisplayName);
                setContactOptions(contactNameOptions);
                setContacts(data || []);
                
                // If we have contacts and no contact is selected, select the first one
                if (data && data.length > 0 && !selectedContactId) {
                  setSelectedContactId(data[0].id);
                }
              } catch (error) {
                console.error("Error fetching contacts:", error);
              }
            };
            
            fetchContacts();
          }}
          contact={selectedContact}
          customerId={customerId}
          customerName={customerName}
          onSave={() => {
            // Refresh contacts when a new contact is saved
            const fetchContacts = async () => {
              if (!customerId) return;
              
              try {
                const { data, error } = await supabase
                  .from("contacts")
                  .select("id, full_name, position, created_at")
                  .eq("customer_id", customerId)
                  .eq("status", "active");

                if (error) throw error;
                
                // Create a map of contact IDs to names and display names
                const contactIdToName: Record<string, string> = {};
                const contactIdToDisplayName: Record<string, string> = {};
                const contactNameOptions: string[] = [];
                
                data?.forEach(contact => {
                  // Store both full name and display name with position
                  contactIdToName[contact.id] = contact.full_name;
                  
                  const displayName = contact.position 
                    ? `${contact.full_name} (${contact.position})` 
                    : contact.full_name;
                  
                  contactIdToDisplayName[contact.id] = displayName;
                  contactNameOptions.push(displayName);
                });
                
                setContactMap(contactIdToName);
                setContactDisplayMap(contactIdToDisplayName);
                setContactOptions(contactNameOptions);
                setContacts(data || []);
                
                // If we have contacts and no contact is selected, select the most recently added one
                if (data && data.length > 0) {
                  // Sort by created_at in descending order to get the most recent contact
                  const sortedContacts = [...data].sort((a, b) => 
                    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                  );
                  setSelectedContactId(sortedContacts[0].id);
                }
              } catch (error) {
                console.error("Error fetching contacts:", error);
              }
            };
            
            fetchContacts();
          }}
        />
      </DialogContent>
    </Dialog>
  );
} 