import React, { useState, useEffect, useMemo } from "react";
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
import { ContactDialog } from "@/components/contacts/ContactDialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFormRegistration } from '@/lib/FormContext';
import { createTask } from '@/components/tasks/createTask';

// Import our new components
import DialogHeaderSection from "./offer-dialog/DialogHeaderSection";
import BasicInfoSection from "./offer-dialog/BasicInfoSection";
import RequirementsSection from "./offer-dialog/RequirementsSection";
import StatusSection from "./offer-dialog/StatusSection";
import CommentsSection from "./offer-dialog/CommentsSection";
import DialogFooterSection from "./offer-dialog/DialogFooterSection";

// Export the props interface so it can be imported by other files
export interface OffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: () => void;
  defaultSource?: string;
}

// Create a context to share state between components
export const OfferDialogContext = React.createContext<any>(null);

// Wrap the component with React.memo to prevent unnecessary re-renders
const OffersDialog = React.memo(function OffersDialog(props: OffersDialogProps) {
  // Generate a unique instance ID for this component instance
  const instanceId = React.useId();
  
  // Check if props is null or undefined
  if (!props || !props.customerId) {
    console.error("OffersDialog received invalid props", props);
    return null;
  }
  
  const {
    open,
    onOpenChange,
    customerId,
    offerId,
    onSave,
    defaultSource = "Email",
  } = props;
  
  // Use useRef to track if this is the first render
  const isFirstRender = React.useRef(true);
  
  // Log initialization only on first render
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    
    return () => {
      // Cleanup on unmount
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Register this form when it's open
  useFormRegistration(
    isEditing 
      ? `Επεξεργασία Προσφοράς: ${customerName || customerId}`
      : `Νέα Προσφορά: ${customerName || customerId}`, 
    open
  );
  
  // Format current date and time in ISO format for datetime-local input
  const formatCurrentDateTimeForInput = (date?: string) => {
    const now = date ? new Date(date) : new Date();
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
    { value: "cancel", label: "Ακύρωση" },
    { value: "waiting", label: "Αναμονή" }
  ];

  // Helper functions for source, status, and result
  const getSourceLabel = (value: string) => {
    switch (value) {
      case "Email":
        return "Email";
      case "Phone":
      case "Telephone":
        return "Τηλέφωνο";
      case "Website":
      case "Site":
        return "Ιστοσελίδα";
      case "In Person":
      case "Physical":
        return "Φυσική παρουσία";
      default:
        return value;
    }
  };
  
  const getSourceValue = (label: string) => {
    switch (label) {
      case "Email":
        return "Email";
      case "Τηλέφωνο":
        return "Phone";
      case "Ιστοσελίδα":
        return "Website";
      case "Φυσική παρουσία":
        return "In Person";
      default:
        return label;
    }
  };

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

  const defaultValues = useMemo(() => ({
    offer_date: formatCurrentDateTimeForInput(),
    source: defaultSource,
    amount: "",
    customer_comments: "",
    our_comments: "",
    offer_result: "wait_for_our_answer",
    result: null,
    assigned_to: user?.id || "",
    hma: false,
    certificate: "",
  }), [defaultSource, user?.id]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues,
  });
  
  // Update source when defaultSource changes
  useEffect(() => {
    setValue("source", defaultSource);
  }, [defaultSource, setValue]);

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
          .select("company_name")
          .eq("id", customerId)
          .single();

        if (error) throw error;
        
        if (data) {
          // Set customer name
          setCustomerName(data.company_name);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };

    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  // Fetch offer data if editing
  useEffect(() => {
    if (offerId) {
      setIsEditing(true);
      const fetchOffer = async () => {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from("offers")
            .select("*, users!offers_assigned_to_fkey(fullname)")
            .eq("id", offerId)
            .single();

          if (error) throw error;

          if (data) {
            setValue("offer_date", formatCurrentDateTimeForInput(data.created_at));
            setValue("source", data.source || defaultSource);
            setValue("amount", data.amount || "");
            setValue("customer_comments", data.customer_comments || "");
            setValue("our_comments", data.our_comments || "");
            setValue("offer_result", data.offer_result || "wait_for_our_answer");
            setValue("result", data.result || null);
            setValue("assigned_to", data.assigned_to || user?.id || "");
            setValue("hma", data.hma || false);
            setValue("certificate", data.certificate || "");
            
            setSelectedContactId(data.contact_id || null);
          }
        } catch (error) {
          console.error("Error fetching offer:", error);
          setError("Failed to load offer data");
        } finally {
          setLoading(false);
        }
      };

      fetchOffer();
    } else {
      setIsEditing(false);
      reset(defaultValues);
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
          // Store full name without position for the dropdown header
          contactIdToName[contact.id] = contact.full_name;
          
          // Store display name with position for the dropdown options
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
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return "";
    // Return only the full name without the position
    return contact.full_name;
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!isFormValid()) {
        return;
      }
      
      const offerData = {
        customer_id: customerId,
        source: data.source,
        amount: data.amount,
        customer_comments: data.customer_comments,
        our_comments: data.our_comments,
        offer_result: data.offer_result,
        result: data.result,
        assigned_to: data.assigned_to,
        contact_id: selectedContactId,
        hma: data.hma,
        certificate: data.certificate,
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
        
        // Create a task for the updated offer if status changed to "ready"
        if (data.offer_result === "ready") {
          try {
            const result = await createTask({
              title: `Follow up on completed offer for ${customerName}`,
              description: `The offer has been marked as ready. Follow up with the customer.`,
              assignedTo: data.assigned_to,
              createdBy: user?.id,
              offerId
            });
            
            if (!result.success) {
              console.error("Failed to create task for offer:", result.error);
            }
          } catch (taskError) {
            console.error("Error creating task for offer:", taskError);
          }
        }
        
        // Call onSave callback
        if (onSave) {
          onSave();
        }
        
        // Close dialog after successful save
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      } else {
        // Create new offer
        const { error } = await supabase
          .from("offers")
          .insert({
            ...offerData,
            created_by: user?.id,
          });

        if (error) throw error;

        toast({
          title: "Επιτυχής δημιουργία",
          description: "Η προσφορά δημιουργήθηκε με επιτυχία.",
        });
        
        setSuccess(true);
        
        // Get the offer ID from the response
        const { data: newOfferData, error: fetchError } = await supabase
          .from("offers")
          .select("id")
          .eq("customer_id", customerId)
          .eq("created_by", user?.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!fetchError && newOfferData) {
          // Create a task for the new offer
          try {
            const result = await createTask({
              title: `Review offer for ${customerName}`,
              description: `Review the offer details and follow up with the customer.`,
              assignedTo: data.assigned_to,
              createdBy: user?.id,
              offerId: newOfferData.id
            });
            
            if (!result.success) {
              console.error("Failed to create task for new offer:", result.error);
            }
          } catch (taskError) {
            console.error("Error creating task for new offer:", taskError);
          }
        }
        
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

  // Add console log when form is fully loaded
  useEffect(() => {
    if (open) {
      // Check if key DOM elements are rendered
      setTimeout(() => {
      }, 100);
    }
  }, [open]);

  // If you're doing focus operations when the dialog opens
  useEffect(() => {
    if (open) {
      // Let the dialog render first
      requestAnimationFrame(() => {
        // Then focus in the next frame
        requestAnimationFrame(() => {
          const element = document.querySelector('.dialog-content input') as HTMLElement;
          if (element) element.focus();
        });
      });
    }
  }, [open]);

  // Create a context value to share with child components
  const contextValue = {
    register,
    watch,
    setValue,
    errors,
    isEditing,
    loading,
    customerName,
    currentDate,
    sourceOptions,
    statusOptions,
    resultOptions,
    userOptions,
    contactOptions,
    selectedContactId,
    setSelectedContactId,
    getSourceLabel,
    getSourceValue,
    getStatusLabel,
    getStatusValue,
    getResultLabel,
    getResultValue,
    getUserIdByName,
    getUserNameById,
    getContactIdByName,
    getContactNameById,
    getContactDisplayNameById,
    watchOfferResult,
    watchResult,
    watchHma,
    setShowContactDialog
  };

  // Find where contactOptions are created or where the dropdown is rendered
  // It might look something like this:
  useEffect(() => {
    // Update contact options to only include full name
    const options = contacts.map(contact => contact.full_name);
    setContactOptions(options);
    
    // Update the display map to only use full name
    const displayMap = {};
    contacts.forEach(contact => {
      displayMap[contact.id] = contact.full_name; // Only use full_name
    });
    setContactDisplayMap(displayMap);
  }, [contacts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
        aria-labelledby="offer-dialog-title"
        aria-describedby="offer-dialog-description"
      >
        <style>
          {`
            textarea {
              min-height: 4rem !important;
              resize: none !important;
            }
            
            /* Remove background and border from dialog header */
            .dialog-header-section,
            .p-5.border-b.border-\\[\\#52796f\\].bg-\\[\\#3a5258\\] {
              background: transparent !important;
              border-bottom: none !important;
            }
            
            /* Custom text selection colors with !important to override */
            .max-w-4xl *::selection {
              background-color: #52796f !important;
              color: #cad2c5 !important;
            }
            
            .max-w-4xl *::-moz-selection {
              background-color: #52796f !important;
              color: #cad2c5 !important;
            }
            
            /* Target specific elements */
            .max-w-4xl textarea::selection,
            .max-w-4xl input::selection,
            .max-w-4xl div::selection {
              background-color: #52796f !important;
              color: #cad2c5 !important;
            }
            
            .max-w-4xl textarea::-moz-selection,
            .max-w-4xl input::-moz-selection,
            .max-w-4xl div::-moz-selection {
              background-color: #52796f !important;
              color: #cad2c5 !important;
            }
            
            /* Specifically target date/time input */
            input[type="datetime-local"]::selection,
            input[type="datetime-local"]::-moz-selection {
              background-color: #52796f !important;
              color: #cad2c5 !important;
            }
            
            /* Target all input types to be safe */
            input[type]::selection,
            input[type]::-moz-selection {
              background-color: #52796f !important;
              color: #cad2c5 !important;
            }
          `}
        </style>
        
        <div className="dialog-content">
          <OfferDialogContext.Provider value={contextValue}>
            <DialogHeaderSection 
              customerName={customerName}
              isEditing={isEditing}
              watch={watch}
              setValue={setValue}
              contactOptions={contactOptions}
              selectedContactId={selectedContactId}
              setSelectedContactId={setSelectedContactId}
              getContactNameById={getContactNameById}
              getContactDisplayNameById={getContactDisplayNameById}
              setShowContactDialog={setShowContactDialog}
              contactDisplayMap={contactDisplayMap}
              contacts={contacts}
            />

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 flex flex-col">
              <div className="space-y-4 mb-4">
                <BasicInfoSection />
                <RequirementsSection />
                <StatusSection />
                <CommentsSection />
              </div>

              <DialogFooterSection 
                error={error}
                success={success}
                loading={loading}
                isEditing={isEditing}
                isFormValid={isFormValid}
                watchOfferResult={watchOfferResult}
                watchResult={watchResult}
                onOpenChange={onOpenChange}
              />
            </form>

            {/* Contact Dialog */}
            <ContactDialog
              open={showContactDialog}
              onOpenChange={(open) => {
                setShowContactDialog(open);
                if (!open) {
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
                }
              }}
              contactId={selectedContact?.id}
              customerId={customerId}
              refreshData={async () => {
                // If you need to refresh contacts, define the function here
                // or call an existing function that fetches contacts
                // For example:
                // await loadContacts();
                // or just return a resolved promise if no action is needed
                return Promise.resolve();
              }}
            />

            {/* Delete Offer Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent aria-describedby="delete-offer-description">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                  <AlertDialogDescription id="delete-offer-description">
                    Are you sure you want to delete this offer? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      // Handle delete logic here
                      setShowDeleteDialog(false);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                    className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
                  >
                    Cancel
                  </Button>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </OfferDialogContext.Provider>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default OffersDialog; 