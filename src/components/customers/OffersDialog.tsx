import React, { useState, useEffect, useMemo, useCallback, createContext } from "react";
import { useForm, UseFormRegister, UseFormWatch, UseFormSetValue, UseFormReset, FormState, UseFormHandleSubmit, FieldValues, Control } from "react-hook-form";
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
import { OffersTableRef } from './OffersTable';
import { useRealtimeSubscription } from '@/lib/useRealtimeSubscription';

// Import our new components
import DialogHeaderSection from "./offer-dialog/DialogHeaderSection";
import BasicInfoSection from "./offer-dialog/BasicInfoSection";
import RequirementsSection from "./offer-dialog/RequirementsSection";
import StatusSection from "./offer-dialog/StatusSection";
import CommentsSection from "./offer-dialog/CommentsSection";
import DialogFooterSection from "./offer-dialog/DialogFooterSection";
import TabsContainer from "./offer-dialog/TabsContainer";
import DetailsTab from "./offer-dialog/DetailsTab";
import SourceSection from "./offer-dialog/SourceSection";
import AssignmentSection from "./offer-dialog/AssignmentSection";
import ResultSection from "./offer-dialog/ResultSection";
import CertificateSection from "./offer-dialog/CertificateSection";

// Export the props interface so it can be imported by other files
export interface OffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: () => void;
  defaultSource?: string;
  tableRef?: React.RefObject<OffersTableRef>;
}

// Define the form values type
interface OfferFormValues {
  offer_date: string;
  source: string;
  amount: string;
  requirements: string;
  customer_comments: string;
  our_comments: string;
  offer_result: string;
  result: any;
  assigned_to: string;
  hma: boolean;
  certificate: string;
  address: string;
  postal_code: string;
  town: string;
  status: string;
}

// Create a context to share state between components
export interface OfferDialogContextType {
  offerId: string | null;
  customerId: string | null;
  isEditing: boolean;
  register: UseFormRegister<OfferFormValues>;
  watch: UseFormWatch<OfferFormValues>;
  setValue: UseFormSetValue<OfferFormValues>;
  control: Control<OfferFormValues>;
  formState: FormState<OfferFormValues>;
  handleSubmit: UseFormHandleSubmit<OfferFormValues>;
  reset: UseFormReset<OfferFormValues>;
  sourceOptions: any[];
  getSourceLabel: (val: any) => string;
  getSourceValue: (val: any) => any;
  statusOptions: any[];
  getStatusLabel: (val: any) => string;
  getStatusValue: (val: any) => any;
  resultOptions: any[];
  getResultLabel: (val: any) => string;
  getResultValue: (val: any) => any;
  userOptions: string[];
  getUserNameById: (id: string) => string;
  getUserIdByName: (name: string) => string;
  registerSaveDetailsToDatabase?: (saveFn: ((realOfferId: string) => Promise<boolean>) | null) => void;
  registerTabReset?: (tabId: string, resetFn: () => void) => void;
  unregisterTabReset?: (tabId: string) => void;
}

export const OfferDialogContext = createContext<OfferDialogContextType | null>(null);

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
    offerId: initialOfferId,
    onSave,
    defaultSource = "Email",
    tableRef,
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
  const [customerPhone, setCustomerPhone] = useState("");
  const [offerId, setOfferId] = useState<string | undefined>(initialOfferId);
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
  const [deleteOldOffer, setDeleteOldOffer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    { value: "none", label: "Κανένα" },
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
    requirements: "",
    customer_comments: "",
    our_comments: "",
    offer_result: "wait_for_our_answer",
    result: null,
    assigned_to: user?.id || "",
    hma: false,
    certificate: "",
    address: "",
    postal_code: "",
    town: ""
  }), [defaultSource, user?.id]);

  // Initialize the form
  const {
    register,
    watch,
    setValue,
    control,
    formState,
    handleSubmit,
    reset
  } = useForm<OfferFormValues>({
    defaultValues: {
      offer_date: new Date().toISOString().split('T')[0],
      source: '',
      amount: '',
      requirements: '',
      customer_comments: '',
      our_comments: '',
      offer_result: '',
      result: '',
      assigned_to: '',
      hma: false,
      certificate: '',
      address: '',
      postal_code: '',
      town: ''
    }
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
    // First try to find the user in the users array
    const user = users.find(u => u.fullname === name);
    if (user?.id) {
      return user.id;
    }
    
    // If not found in users array, try to find in the userMap
    const userEntry = Object.entries(userMap).find(([_, userName]) => userName === name);
    if (userEntry) {
      return userEntry[0]; // Return the user ID
    }
    
    // If still not found, log a warning and return the current user's ID as fallback
    console.warn(`User with name "${name}" not found. Using current user as fallback.`);
    return user?.id || "";
  };

  const getUserNameById = (id: string) => {
    return userMap[id] || "";
  };

  // Fetch customer data including address
  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        // Validate customerId format (should be a UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(customerId)) {
          return;
        }
        
        // Try a different approach with the query
        const { data, error } = await supabase
          .from("customers")
          .select("*")  // Select all columns first
          .eq("id", customerId)
          .single();

        if (error) throw error;
        
        if (data) {
          // Set customer name and phone
          setCustomerName(data.company_name);
          setCustomerPhone(data.telephone || "");
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
            .is("deleted_at", null)
            .single();

          if (error) {
            // Check if it's a "no rows returned" error, which might mean the offer was soft-deleted
            if (error.message?.includes('multiple (or no) rows returned') || error.details?.includes('contains 0 rows')) {
              // Try to fetch the offer without the deleted_at filter to confirm it's soft-deleted
              const { data: softDeletedOffer, error: softDeletedError } = await supabase
                .from("offers")
                .select("deleted_at")
                .eq("id", offerId)
                .single();
                
              if (!softDeletedError && softDeletedOffer && softDeletedOffer.deleted_at) {
                // The offer exists but is soft-deleted
                toast({
                  title: "Offer Unavailable",
                  description: "This offer has been deleted and cannot be edited.",
                  variant: "destructive",
                });
                onOpenChange(false); // Close the dialog
              } else {
                // It's some other error
                console.error("Error fetching offer data:", error);
                throw error;
              }
            } else {
              console.error("Error fetching offer data:", error);
              throw error;
            }
          }
          
          if (data) {
            // Reset the form first to clear any existing values
            reset({
              offer_date: formatCurrentDateTimeForInput(data.created_at),
              source: data.source || defaultSource,
              amount: data.amount || "",
              requirements: data.requirements || "",
              customer_comments: data.customer_comments || "",
              our_comments: data.our_comments || "",
              offer_result: data.offer_result || "wait_for_our_answer",
              result: data.result || null,
              assigned_to: data.assigned_to || user?.id || "",
              hma: data.hma || false,
              certificate: data.certificate || "",
              address: data.address || "",
              postal_code: data.postal_code || "",
              town: data.town || ""
            });
            
            setSelectedContactId(data.contact_id || null);
            
            // Force a re-render to ensure the form values are displayed
            setTimeout(() => {
              // This will trigger a re-render of the form
              const formValues = watch();
            }, 0);
          }
        } catch (error) {
          console.error("Error fetching offer:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchOffer();
    } else {
      setIsEditing(false);
      reset(defaultValues);
    }
  }, [offerId, open, defaultSource, currentDate, reset, setValue, user?.id, watch]);

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

  // Tab reset functions
  const [detailsTabReset, setDetailsTabReset] = useState<(() => void) | null>(null);
  
  // Function to register a tab reset function
  const registerTabReset = useCallback((tabId: string, resetFn: () => void) => {
    if (tabId === 'details') {
      setDetailsTabReset(() => resetFn);
    }
  }, []);
  
  // Function to unregister a tab reset function
  const unregisterTabReset = useCallback((tabId: string) => {
    if (tabId === 'details') {
      setDetailsTabReset(null);
    }
  }, []);
  
  // Function to reset all tabs
  const resetAllTabs = useCallback(() => {
    if (detailsTabReset) {
      try {
        detailsTabReset();
      } catch (error) {
        // Silently catch errors
      }
    }
  }, [detailsTabReset]);

  // Function to check if the form is valid
  const isFormValid = () => {
    // Check required fields
    const formData = watch();
    
    // Check if source is selected
    if (!formData.source) {
      setError("Παρακαλώ επιλέξτε πηγή.");
      return false;
    }
    
    // If status is not "wait_for_our_answer", result is required
    if (formData.offer_result && formData.offer_result !== "wait_for_our_answer" && (!formData.result || formData.result === "none")) {
      // We're removing this validation as requested
      // setError("Παρακαλώ επιλέξτε αποτέλεσμα.");
      // return false;
      
      // Instead, we'll allow the form to be submitted without a result
      console.log("No result selected, but continuing anyway as requested");
    }
    
    // All validations passed
    return true;
  };

  // Add a function to save the offer and return the offer ID
  const saveOfferAndGetId = async (): Promise<string | null> => {
    try {
      // Get the current form data
      const formData = watch();
      
      // Validate required fields
      if (!isFormValid()) {
        return null;
      }
      
      if (offerId && !offerId.startsWith('temp-')) {
        // If we already have a real offer ID, return it
        return offerId;
      } else {
        // If no offer ID exists or it's a temporary ID, return null
        // This prevents any database interactions until the form is explicitly saved
        console.log("No real offer ID exists, returning null to prevent database interaction");
        return null;
      }
    } catch (error) {
      console.error("Error in saveOfferAndGetId:", error);
      return null;
    }
  };

  // Add a ref to store the saveDetailsToDatabase function
  const saveDetailsToDatabaseRef = React.useRef<((realOfferId: string) => Promise<boolean>) | null>(null);
  
  // Function to register the saveDetailsToDatabase function
  const registerSaveDetailsToDatabase = useCallback((saveFn: ((realOfferId: string) => Promise<boolean>) | null) => {
    saveDetailsToDatabaseRef.current = saveFn;
  }, []);
  
  // Create the context value with useMemo to optimize performance
  const contextValue = useMemo(() => ({
    offerId, 
    customerId, 
    isEditing,
    register,
    watch,
    setValue,
    control,
    formState,
    handleSubmit,
    reset,
    sourceOptions,
    getSourceLabel,
    getSourceValue,
    statusOptions,
    getStatusLabel,
    getStatusValue,
    resultOptions,
    getResultLabel,
    getResultValue,
    userOptions,
    getUserNameById,
    getUserIdByName,
    registerSaveDetailsToDatabase,
    registerTabReset,
    unregisterTabReset
  }), [
    offerId, 
    customerId, 
    isEditing,
    register,
    watch,
    setValue,
    control,
    formState,
    handleSubmit,
    reset,
    sourceOptions,
    getSourceLabel,
    getSourceValue,
    statusOptions,
    getStatusLabel,
    getStatusValue,
    resultOptions,
    getResultLabel,
    getResultValue,
    userOptions,
    getUserNameById,
    getUserIdByName,
    registerSaveDetailsToDatabase,
    registerTabReset,
    unregisterTabReset
  ]);

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

  // Set up real-time subscription for this specific offer
  useRealtimeSubscription(
    { 
      table: 'offers',
      filter: offerId ? `id=eq.${offerId}` : null
    },
    (payload) => {
      if (payload.eventType === 'UPDATE' && offerId) {
        // Only update if we're not the one making the change
        // This prevents conflicts with local form state
        if (!isSubmitting) {
          const updatedOffer = payload.new;
          
          // Show a notification that the offer was updated by someone else
          toast({
            title: "Offer Updated",
            description: "This offer has been updated by another user",
            variant: "default",
          });
          
          // You might want to refresh the form data or show a confirmation dialog
          // asking if the user wants to load the latest changes
        }
      }
    },
    [offerId, isSubmitting]
  );

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!isFormValid()) {
        return;
      }
      
      // Convert 'none' result to null
      const resultValue = data.result === "none" ? null : data.result;
      
      // Validate assigned_to is a valid UUID
      if (data.assigned_to && typeof data.assigned_to === 'string') {
        // UUID validation regex
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(data.assigned_to)) {
          console.error("Invalid assigned_to value:", data.assigned_to);
          setError("Μη έγκυρη τιμή για το πεδίο 'Ανάθεση σε'.");
          return;
        }
      }
      
      const offerData = {
        customer_id: customerId,
        source: data.source,
        amount: data.amount,
        requirements: data.requirements,
        customer_comments: data.customer_comments,
        our_comments: data.our_comments,
        offer_result: data.offer_result,
        result: resultValue, // Use the converted value
        assigned_to: data.assigned_to,
        contact_id: selectedContactId,
        hma: data.hma,
        certificate: data.certificate,
        address: data.address,
        tk: data.postal_code,
        town: data.town
      };
      
      // Variables to store data during the save process
      let savedOfferId = null;
      let assignedUserChanged = false;
      let currentOfferData = null;
      
      // STEP 1: Save or update the offer in the database
      try {
        if (isEditing && offerId && !offerId.startsWith('temp-')) {
          // Update existing offer
          
          // First, get the current offer data to check for changes
          const { data: currentOffer, error: fetchError } = await supabase
            .from("offers")
            .select("*, users!offers_assigned_to_fkey(fullname), customers(company_name)")
            .eq("id", offerId)
            .single();
            
          if (fetchError) throw fetchError;
          
          // Store current offer data for later use
          currentOfferData = currentOffer;
          
          // Check if assigned user has changed
          assignedUserChanged = currentOffer && currentOffer.assigned_to !== offerData.assigned_to;
          
          // Update the offer
          const { data: updatedOffer, error: updateError } = await supabase
            .from("offers")
            .update(offerData)
            .eq("id", offerId)
            .select()
            .single();
            
          if (updateError) {
            console.error("Error updating offer:", updateError);
            throw updateError;
          }
          
          savedOfferId = updatedOffer.id;
          
          // Use the tableRef for optimistic updates if available
          if (tableRef?.current && updatedOffer) {
            tableRef.current.updateOfferInList(updatedOffer);
          }
        } else {
          // Create new offer
          console.log("Creating new offer");
          
          const { data: newOffer, error } = await supabase
            .from("offers")
            .insert({
              ...offerData,
              created_by: user?.id,
            })
            .select()
            .single();

          if (error) {
            console.error("Error creating offer:", error);
            throw error;
          }
          
          console.log("Successfully created offer:", newOffer);

          // Update the offer ID with the real one from the database
          savedOfferId = newOffer.id;
          setOfferId(newOffer.id);

          // Use the tableRef for optimistic updates if available
          if (tableRef?.current && newOffer) {
            tableRef.current.addOfferToList(newOffer);
          }
        }
        
        // STEP 2: Now that we have a valid offer ID, save the details
        if (savedOfferId && saveDetailsToDatabaseRef.current) {
          try {
            const detailsSaveResult = await saveDetailsToDatabaseRef.current(savedOfferId);
            
            if (!detailsSaveResult) {
              // We don't throw an error here because we want to continue even if details save fails
              // The offer has been saved successfully
            }
          } catch (error) {
            console.error("Error calling saveDetailsToDatabase:", error);
          }
        } else {
          console.log("No details to save or saveDetailsToDatabase function not available", {
            savedOfferId,
            saveDetailsToDatabase: !!saveDetailsToDatabaseRef.current,
            saveDetailsToDatabaseRefType: typeof saveDetailsToDatabaseRef.current
          });
        }
        
        // STEP 3: Show success message and close dialog
        setSuccess(true);
        
        // Call onSave callback
        if (onSave) {
          onSave();
        }
        
        // Close dialog after successful save - reduced delay
        setTimeout(() => {
          onOpenChange(false);
        }, 500);
        
        // Create tasks and notifications asynchronously after closing the dialog
        setTimeout(() => {
          try {
            // If assigned user has changed, create a task for the new assignee
            if (assignedUserChanged && offerData.assigned_to && currentOfferData) {
              const companyName = currentOfferData.customers?.company_name || "Unknown Company";
              const newAssigneeName = userMap[offerData.assigned_to] || 'Unknown User';
              const oldAssigneeName = userMap[currentOfferData.assigned_to] || 'Unknown User';
              
              // Create a task for the new assignee using the createTask helper function
              createTask({
                title: `Offer assigned for ${companyName}`,
                description: `You have been assigned an offer for ${companyName}. Please review and take appropriate action.`,
                assignedTo: offerData.assigned_to,
                createdBy: user.id,
                offerId: savedOfferId,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Due in 7 days
              }).catch(taskError => {
                console.error("Error creating task for new assignee:", taskError);
              });
            }
            
            // Create a task for the updated offer if status changed to "ready"
            if (data.offer_result === "ready") {
              createTask({
                title: `Follow up on completed offer for ${customerName}`,
                description: `The offer has been marked as ready. Follow up with the customer.`,
                assignedTo: data.assigned_to,
                createdBy: user?.id,
                offerId: savedOfferId
              }).catch(taskError => {
                console.error("Error creating task for offer:", taskError);
              });
            }
            
            // For new offers, create a review task
            if (!isEditing || (offerId && offerId.startsWith('temp-'))) {
              createTask({
                title: `Review offer for ${customerName}`,
                description: `Review the offer details and follow up with the customer.`,
                assignedTo: data.assigned_to,
                createdBy: user?.id,
                offerId: savedOfferId
              }).catch(taskError => {
                console.error("Error creating task for new offer:", taskError);
              });
            }
          } catch (error) {
            console.error("Error creating tasks:", error);
          }
        }, 100);
      } catch (error) {
        console.error("Error saving offer or details:", error);
        setError("Σφάλμα κατά την αποθήκευση της προσφοράς. Παρακαλώ δοκιμάστε ξανά.");
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      setError("Σφάλμα κατά την υποβολή της φόρμας. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    onOpenChange(false);
  };

  const watchOfferResult = watch("offer_result");
  const watchResult = watch("result");
  const watchHma = watch("hma");
  
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

  // Update form values when they change
  useEffect(() => {
    // This effect is used to track form changes
    const subscription = watch((value, { name, type }) => {
      // We don't need to do anything here, just watching for changes
    });
    
    return () => subscription.unsubscribe();
  }, [watch]);

  return (
    <OfferDialogContext.Provider value={contextValue}>
      <Dialog open={open} onOpenChange={(newOpen) => {
        // Only reset tabs when dialog is closing, not when opening
        if (open && !newOpen) {
          resetAllTabs();
        }
        onOpenChange(newOpen);
      }}>
        <DialogContent
          className="max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5] p-3"
          style={{ height: 'auto', maxHeight: '90vh', overflow: 'hidden' }}
          aria-labelledby="offer-dialog-title"
          aria-describedby="offer-dialog-description"
        >
          <style>
            {`
              textarea {
                min-height: 2.5rem !important;
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
              
              /* Override datetime-local display format */
              input[type="datetime-local"] {
                position: relative;
              }
              
              input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                background: transparent;
                bottom: 0;
                color: transparent;
                cursor: pointer;
                height: auto;
                left: 0;
                position: absolute;
                right: 0;
                top: 0;
                width: auto;
                z-index: 1;
              }
              
              input[type="datetime-local"]::before {
                color: #cad2c5;
                content: attr(data-date);
              }
              
              input[type="datetime-local"]:focus::before {
                display: none;
              }
            `}
          </style>
          
          <div className="dialog-content">
            <DialogHeaderSection 
              customerName={customerName}
              customerPhone={customerPhone}
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
              sourceOptions={sourceOptions}
              getSourceLabel={getSourceLabel}
              getSourceValue={getSourceValue}
            />

            <form onSubmit={handleSubmit(onSubmit)} className="p-2 flex flex-col" style={{ height: 'auto', minHeight: 'auto', display: 'flex', flexDirection: 'column' }}>
              <TabsContainer>
                {/* Tab 1: Basic Information */}
                <div className="space-y-3">
                  <BasicInfoSection />
                  <RequirementsSection />
                  <StatusSection />
                  <CommentsSection />
                </div>
                
                {/* Tab 2: Details */}
                <DetailsTab />
              </TabsContainer>

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
          </div>
        </DialogContent>
      </Dialog>
    </OfferDialogContext.Provider>
  );
});

export default OffersDialog; 