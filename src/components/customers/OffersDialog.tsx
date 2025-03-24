import React, { useState, useEffect, useMemo, useCallback, createContext } from "react";
import { useForm, UseFormRegister, UseFormWatch, UseFormSetValue, UseFormReset, FormState, UseFormHandleSubmit, FieldValues, Control } from "react-hook-form";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/utils/formatUtils";
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
import { validate as uuidValidate } from 'uuid';
import { validateRequired, validateAlphanumeric } from '../../utils/validationUtils';

// Import our new components
import DialogHeaderSection from "./offer-dialog/DialogHeaderSection";
import BasicInfoSection from "./offer-dialog/BasicInfoSection";
import RequirementsSection from "./offer-dialog/RequirementsSection";
import StatusSection from "./offer-dialog/StatusSection";
import CommentsSection from "./offer-dialog/CommentsSection";
import DialogFooterSection from "./offer-dialog/DialogFooterSection";
import DetailsTab from "./offer-dialog/DetailsTab";
import SourceSection from "./offer-dialog/SourceSection";
import AssignmentSection from "./offer-dialog/AssignmentSection";
import ResultSection from "./offer-dialog/ResultSection";
import CertificateSection from "./offer-dialog/CertificateSection";
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";

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
  offer_date?: string;
  created_at?: string;
  source?: string;
  amount?: string;
  requirements?: string;
  customer_comments?: string;
  our_comments?: string;
  offer_result?: string;
  result?: string;
  assigned_to?: string;
  hma?: boolean;
  certificate?: string;
  address?: string;
  postal_code?: string;
  town?: string;
  status?: string;
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
  registerDeletedDetails?: (detailIds: string | string[] | number | number[]) => void;
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
  
  // Track deleted detail IDs for batch deletion
  const [deletedDetailIds, setDeletedDetailIds] = useState<(string | number)[]>([]);
  
  // Add a ref to store deleted detail IDs - using the correct type for both string and number IDs
  const deletedDetailsRef = React.useRef<(string | number)[]>([]);
  
  // Function to register details for deletion
  const registerDeletedDetails = useCallback((detailId: string | string[] | number | number[]) => {
    // Update the ref for immediate access
    if (Array.isArray(detailId)) {
      // Convert all IDs to strings for consistency
      const stringIds = detailId.map(id => id.toString());
      deletedDetailsRef.current = [...deletedDetailsRef.current, ...stringIds];
    } else {
      // Convert ID to string for consistency
      deletedDetailsRef.current = [...deletedDetailsRef.current, detailId.toString()];
    }
    
    // Also update the state for component re-renders and persistence
    if (Array.isArray(detailId)) {
      // Convert all IDs to strings for consistency
      const stringIds = detailId.map(id => id.toString());
      setDeletedDetailIds(prev => [...prev, ...stringIds]);
    } else {
      // Convert ID to string for consistency
      setDeletedDetailIds(prev => [...prev, detailId.toString()]);
    }
  }, []);
  
  // Register this form when it's open
  useFormRegistration(
    isEditing 
      ? `Επεξεργασία Προσφοράς: ${customerName || customerId}`
      : `Νέα Προσφορά: ${customerName || customerId}`, 
    open
  );
  
  // Format current date and time in ISO format for datetime-local input
  const formatCurrentDateTimeForInput = (date?: string) => {
    try {
      const now = date ? new Date(date) : new Date();
      now.setMilliseconds(0); // Reset milliseconds for consistency
      
      // First return a proper ISO string for the database
      return now.toISOString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return new Date().toISOString();
    }
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

  const defaultValues = useMemo(() => {
    // Create a single date string for both fields
    const dateString = formatCurrentDateTimeForInput();
    
    return {
      offer_date: dateString, // For UI display only
      created_at: dateString, // This is what will be saved to DB
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
    };
  }, [defaultSource, user?.id]);

  // Initialize form with react-hook-form
  const {
    register,
    watch,
    setValue,
    reset,
    control,
    handleSubmit,
    formState,
  } = useForm<OfferFormValues>({
    defaultValues: {
      offer_date: formatCurrentDateTimeForInput(), // For UI display only
      created_at: formatCurrentDateTimeForInput(), // This is what will be saved to DB
      source: defaultSource,
      amount: "",
      requirements: "",
      customer_comments: "",
      our_comments: "",
      offer_result: "wait_for_our_answer",
      result: "none",
      assigned_to: user?.id || "",
      hma: false,
      certificate: "",
      address: "",
      postal_code: "",
      town: "",
      status: "active"
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
        if (!uuidValidate(customerId)) {
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
            .select("*")
            .eq("id", offerId)
            .single();

          if (error) {
            throw error;
          }
          
          if (data) {
            // Get the date from created_at in the database
            const dateString = data.created_at || formatCurrentDateTimeForInput();
            
            // Reset the form first to clear any existing values
            reset({
              // Use created_at for both fields since offer_date doesn't exist in DB
              offer_date: dateString,
              created_at: dateString,
              source: (data as any).source || defaultSource,
              amount: (data as any).amount || "",
              requirements: (data as any).requirements || "",
              customer_comments: (data as any).customer_comments || "",
              our_comments: (data as any).our_comments || "",
              offer_result: (data as any).offer_result || "wait_for_our_answer",
              result: (data as any).result || null,
              assigned_to: (data as any).assigned_to || user?.id || "",
              hma: (data as any).hma || false,
              certificate: (data as any).certificate || "",
              address: (data as any).address || "",
              postal_code: (data as any).tk || "", // Map tk from database to postal_code in form
              town: (data as any).town || ""
            });
            
            // Set the contact ID from the fetched data
            setSelectedContactId(data.contact_id || null);
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
  }, [offerId, open, defaultSource, reset, setValue, user?.id]);

  // Fetch customer contacts
  useEffect(() => {
    const fetchContacts = async () => {
      if (!customerId) return;
      
      try {
        const { data, error } = await supabase
          .from("contacts")
          .select("id, full_name, position, created_at")
          .eq("customer_id", customerId)
          .eq("status", "active")
          .is("deleted_at", null);

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
    const sourceResult = validateRequired(formData.source);
    if (!sourceResult.isValid) {
      setError("Παρακαλώ επιλέξτε πηγή.");
      return false;
    }
    
    // If status is not "wait_for_our_answer", result is required
    if (formData.offer_result && formData.offer_result !== "wait_for_our_answer" && (!formData.result || formData.result === "none")) {
      // We're removing this validation as requested
      // setError("Παρακαλώ επιλέξτε αποτέλεσμα.");
      // return false;
      
      // Instead, we'll allow the form to be submitted without a result
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
      
      // Convert amount to number if it exists
      const amountValue = formData.amount ? parseFloat(formData.amount) : null;

      // Prepare the offer data
      const offerData = {
        customer_id: customerId,
        source: formData.source,
        amount: amountValue,
        requirements: formData.requirements || "",
        customer_comments: formData.customer_comments || "",
        our_comments: formData.our_comments || "",
        offer_result: formData.offer_result || "wait_for_our_answer",
        result: formData.result && formData.result !== "none" ? formData.result : null,
        assigned_to: formData.assigned_to || user?.id,
        hma: formData.hma || false,
        certificate: formData.certificate || "",
        address: formData.address || "",
        tk: formData.postal_code || "",
        town: formData.town || "",
        contact_id: selectedContactId,
        created_by: user?.id
      };
      
      if (offerId && !offerId.startsWith('temp-')) {
        // If we have a real offer ID, update the existing offer
        const { data, error } = await supabase
          .from("offers")
          .update({
            ...offerData,
            updated_at: new Date().toISOString()
          })
          .eq("id", offerId)
          .select()
          .single();
        
        if (error) {
          console.error("Error updating offer:", error);
          throw error;
        }
        
        return data.id;
      } else {
        // Create a new offer
        const { data, error } = await supabase
          .from("offers")
          .insert({
            ...offerData,
            created_at: formData.created_at || new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          console.error("Error creating offer:", error);
          throw error;
        }
        
        // Update the component state with the new offer ID
        setOfferId(data.id);
        
        return data.id;
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
    unregisterTabReset,
    registerDeletedDetails
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
    unregisterTabReset,
    registerDeletedDetails
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

  // Enhanced onSubmit function with better handling of details saving
  const onSubmit = async (data) => {
    try {
      // Show the loading state
      setLoading(true);
      
      // Clear any previous errors
      setError(null);
      
      // STEP 1: Create/Update the offer
      let savedOfferId = null;
      try {
        savedOfferId = await saveOfferAndGetId();
        if (!savedOfferId) {
          throw new Error("Failed to save offer - no ID returned");
        }
      } catch (error) {
        console.error("Error saving offer:", error);
        setError("Σφάλμα κατά την αποθήκευση προσφοράς.");
        setLoading(false);
        return;
      }
      
      // STEP 2: Now that we have a valid offer ID, save the details
      if (savedOfferId && saveDetailsToDatabaseRef.current) {
        try {
          await saveDetailsToDatabaseRef.current(savedOfferId);
        } catch (detailsError) {
          console.error("Error saving details:", detailsError);
          // We don't fail the whole save if details fail
        }
      }
      
      // STEP 3: Process any deleted details
      if (savedOfferId && deletedDetailIds.length > 0) {
        try {
          // Process each ID individually to avoid batch issues
          for (const id of deletedDetailIds) {
            try {
              // Ensure ID is a string for consistency
              const stringId = id.toString();
              
              // Try to delete the detail. Some might fail if they are temporary IDs 
              // that weren't actually saved to the database, and that's OK.
              const { error: deleteError } = await supabase
                .from("offer_details")
                .delete()
                .eq("id", stringId);
                
              if (deleteError) {
                console.error(`Error deleting offer detail ID ${stringId}:`, deleteError);
              }
            } catch (err) {
              console.error(`Error processing deletion for ID ${id}:`, err);
            }
          }
          
          // Clear the deleted details after processing
          setDeletedDetailIds([]);
          deletedDetailsRef.current = [];
        } catch (error) {
          console.error("Error processing deleted details:", error);
        }
      }
      
      // STEP 4: Show success message and close dialog
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
          if (data.assigned_to && userMap[data.assigned_to]) {
            const companyName = userMap[data.assigned_to] || "Unknown Company";
            const newAssigneeName = userMap[data.assigned_to] || 'Unknown User';
            const oldAssigneeName = userMap[data.assigned_to] || 'Unknown User';
            
            // Create a task for the new assignee using the createTask helper function
            createTask({
              title: `Offer assigned for ${companyName}`,
              description: `You have been assigned an offer for ${companyName}. Please review and take appropriate action.`,
              assignedTo: data.assigned_to,
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
              createdBy: user.id,
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
              createdBy: user.id,
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
      console.error("Error in form submission:", error);
      setError("Σφάλμα κατά την υποβολή της φόρμας. Παρακαλώ δοκιμάστε ξανά.");
    } finally {
      setLoading(false);
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
          style={{ 
            height: '85vh', 
            maxHeight: '950px', 
            minHeight: '750px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible' 
          }}
          aria-labelledby="offer-dialog-title"
          aria-describedby="offer-dialog-description"
        >
          <style>
            {`
            /* DialogContent wrapper for consistent display and scrolling */
            .dialog-content {
              display: flex;
              flex-direction: column;
              height: 100%;
              width: 100%;
              position: relative;
              z-index: 1;
            }
            
            /* Make form fill available space */
            .dialog-content form {
              flex: 1;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              border-bottom: none;
              position: relative;
              z-index: 2;
            }

            /* Additional style to ensure form inputs are interactive */
            .dialog-content form input,
            .dialog-content form textarea,
            .dialog-content form select,
            .dialog-content form button {
              position: relative;
              z-index: 10;
              pointer-events: auto;
            }
            
            /* Tab specific styling */
            .app-tabs-container {
              height: 100%;
              display: flex;
              flex-direction: column;
              position: relative;
              z-index: 3;
            }
            
            /* Ensure tab triggers are properly positioned */
            [role="tablist"] {
              position: sticky !important;
              top: 0;
              z-index: 50;
              background-color: #2f3e46;
            }
            
            /* Make sure tab content fills the available space */
            [data-radix-tabs-content] {
              height: 100%;
              padding-bottom: 70px; /* Add space for footer */
              background-color: #2a3b42; /* Darker background color for tab content */
              position: relative; /* Add position relative */
              z-index: 4; /* Lower z-index than tab triggers but higher than other elements */
            }

            /* Section styling */
            [data-radix-tabs-content] > div > div {
              margin-bottom: 1rem;
              border: 1px solid #52796f;
              background-color: #2a3b42; /* Add darker background to sections */
              padding: 1rem;
              border-radius: 0.375rem;
              position: relative; /* Add position relative */
              z-index: 5; /* Make sure sections appear above the tab content background */
            }
            
            /* Ensure footer buttons are always visible and fixed at bottom */
            .dialog-footer {
              position: fixed;
              bottom: 10px;
              right: 24px;
              z-index: 60; /* Higher than tab triggers */
              padding: 10px 0;
              background-color: transparent;
              border: none;
              border-radius: 0;
              min-height: 60px;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              box-shadow: none;
            }
            
            /* Delete button styling */
            .delete-btn {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 24px;
              height: 24px;
              border-radius: 4px;
              color: #84a98c;
              background-color: transparent;
              border: none;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            
            .delete-btn:hover {
              background-color: rgba(53, 79, 82, 0.7);
            }
            
            .delete-btn:focus {
              outline: none;
            }
            
            /* Ensure cursor is visible on hover */
            .delete-btn:hover svg {
              color: #cad2c5;
            }
            
            /* Add visual feedback on active state */
            .delete-btn:active {
              transform: scale(0.95);
            }
            
            textarea {
              min-height: 4rem !important;
              resize: none !important;
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

            /* Style for rows being deleted */
            .deleting-row {
              background-color: rgba(255, 0, 0, 0.05) !important;
              transition: all 0.3s ease;
              pointer-events: none;
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
           
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden relative p-2">
              <AppTabs defaultValue="basic" className="app-tabs-container">
                <AppTabsList>
                  <AppTabsTrigger value="basic">Βασικά Στοιχεία</AppTabsTrigger>
                  <AppTabsTrigger value="details">Λεπτομέρειες</AppTabsTrigger>
                </AppTabsList>
                
                <div className="flex-1 relative" style={{ minHeight: '600px' }}>
                  {/* Tab 1: Basic Information */}
                  <AppTabsContent value="basic" className="absolute inset-0 pt-4 overflow-auto pointer-events-auto">
                    <BasicInfoSection />
                    <RequirementsSection />
                    <StatusSection />
                    <CommentsSection />
                  </AppTabsContent>
                  
                  {/* Tab 2: Details */}
                  <AppTabsContent value="details" className="absolute inset-0 pt-2 overflow-auto pointer-events-auto">
                    <DetailsTab />
                  </AppTabsContent>
                </div>
              </AppTabs>
             
              <div className="dialog-footer">
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
             </div>
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
                       .eq("status", "active")
                       .is("deleted_at", null);

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