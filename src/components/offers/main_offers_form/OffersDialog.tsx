import React, { createContext, useCallback, useEffect, useRef, useState, useMemo, useId } from 'react';
import { useForm, UseFormGetValues, UseFormRegister, UseFormReset, UseFormSetError, UseFormSetValue, UseFormWatch, FormState, UseFormHandleSubmit, FieldValues, Control } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GlobalDropdown } from '@/components/ui/GlobalDropdown';
import { Check, X, Plus, Save, Calendar, Phone } from 'lucide-react';
import { ContactDialog } from '@/components/contacts/ContactDialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFormRegistration } from '@/lib/FormContext';
import { createTask } from '@/components/tasks/createTask';
import { OffersTableRef } from './OffersTable';
import { validate as uuidValidate } from 'uuid';
import { validateRequired, validateAlphanumeric } from '@/utils/validationUtils';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AccessibleDialogContent } from '@/components/ui/DialogUtilities';

// Import our new components
import DetailsTab from "./offer-dialog/DetailsTab";
import BasicTab from "./offer-dialog/BasicTab";
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";

// Import styling
import './offer-dialog/OffersDialog.css';

// Define TypeScript interface for window extension
declare global {
  interface Window {
    offerDetailsSaveFunctions: {
      [key: string]: ((realOfferId: string) => Promise<boolean>) | null;
    };
    _lastSaveDetailsFn: ((realOfferId: string) => Promise<boolean>) | null;
    _updateSaveDetailsFnBackup: (fn: ((realOfferId: string) => Promise<boolean>) | null) => boolean;
    _getSaveDetailsFnBackup: () => ((realOfferId: string) => Promise<boolean>) | null;
    _supabaseTabId?: string;
  }
}

// Create a singleton backup for the save function that persists across rerenders
if (typeof window !== 'undefined') {
  // Initialize backup mechanism
  if (!window._lastSaveDetailsFn) {
    window._lastSaveDetailsFn = null;
  }
  
  // Add a small utility function to update the backup
  if (!window._updateSaveDetailsFnBackup) {
    window._updateSaveDetailsFnBackup = (fn) => {
      if (fn && typeof fn === 'function') {
        window._lastSaveDetailsFn = fn;
        return true;
      }
      return false;
    };
  }
  
  // Add a way to retrieve the backup
  if (!window._getSaveDetailsFnBackup) {
    window._getSaveDetailsFnBackup = () => {
      return window._lastSaveDetailsFn;
    };
  }
}

// Export the props interface so it can be imported by other files
export interface OffersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  offerId?: string;
  onSave: (offer?: any) => void;
  defaultSource?: string;
  tableRef?: React.RefObject<OffersTableRef>;
}

// Define the form values type
interface OfferFormValues {
  customer_id: string;
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

// Define the database offer type
interface DatabaseOffer {
  id: string;
  customer_id: string;
  requirements: string;
  amount: number;
  offer_result: string;
  result: string;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  source: string;
  customer_comments: string;
  our_comments: string;
  created_by: string;
  updated_by: string;
  contact_id: string | null;
  deleted_at: string;
  hma: boolean;
  certificate: string;
  address: string;
  tk: string;
  town: string;
  status: string;
}

// Create a context to share state between components
export interface OfferDialogContextType {
  offerId: string | null;
  customerId: string;
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

// TEMPORARY FIX: Define a hardcoded admin ID as fallback
const ADMIN_USER_ID = '3fbf35f7-5730-47d5-b9d2-f742b24c9d26';

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
  }, []);
  
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
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
  const [errorMessage, setErrorMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
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
    `Νέα Προσφορά: ${customerName || customerId}`,
    open
  );
  
  // Date formatting utility functions
  const dateFormatUtils = useMemo(() => {
    return {
      // Format current date and time in ISO format for datetime-local input
      formatCurrentDateTime: (date?: string) => {
        try {
          const now = date ? new Date(date) : new Date();
          now.setMilliseconds(0); // Reset milliseconds for consistency
          
          // First return a proper ISO string for the database
          return now.toISOString();
        } catch (error) {
          console.error("Error formatting date:", error);
          return new Date().toISOString();
        }
      },
      
      // Format date for display
      formatDateDisplay: (dateString: string) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString("el-GR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }) + " " + date.toLocaleTimeString("el-GR", {
            hour: "2-digit",
            minute: "2-digit"
          });
        } catch (error) {
          return "";
        }
      }
    };
  }, []);
  
  // Initialize form with react-hook-form
  const {
    register,
    watch,
    setValue,
    getValues,
    control,
    formState,
    handleSubmit,
    reset,
    setError,
  } = useForm<OfferFormValues>({
    defaultValues: {
      customer_id: customerId,
      created_at: dateFormatUtils.formatCurrentDateTime(),
      source: defaultSource || "Email",
      amount: "",
      requirements: "",
      customer_comments: "",
      our_comments: "",
      offer_result: "wait_for_our_answer",
      result: "none",
      assigned_to: "",
      hma: false,
      certificate: "",
      address: "",
      postal_code: "",
      town: "",
      status: "active"
    }
  });
  
  // Form validation utilities
  const formValidationUtils = useMemo(() => {
    return {
      isFormValid: () => {
        const values = getValues();
        let isValid = true;

        // Check if amount is a valid number
        if (values.amount && !/^\d+(\.\d{1,2})?$/.test(values.amount)) {
          setError("amount", {
            type: "manual",
            message: "Το ποσό πρέπει να είναι έγκυρος αριθμός"
          });
          isValid = false;
        } else {
          setError("amount", {
            type: "manual",
            message: ""
          });
        }

        // Clear error message if form is valid
        if (isValid) {
          setErrorMessage("");
        }

        return isValid;
      },
      normalizeAmount: (amount: any): string | null => {
        if (!amount) return null;
        const numericAmount = parseFloat(amount);
        return isNaN(numericAmount) ? null : numericAmount.toString();
      }
    };
  }, [getValues, setError]);
  
  // Extract utility functions for convenience
  const { isFormValid, normalizeAmount } = formValidationUtils;

  // Function to save offer data and get the ID
  const saveOfferAndGetId = useCallback(async (formData: any): Promise<string | null> => {
    try {
      // Clear any previous errors
      setErrorMessage("");
      
      // Log formData for debugging
      console.log('📝 Form data:', formData);
      console.log('📝 Postal code value:', formData.postal_code);

      const safeUserId = user?.id || ADMIN_USER_ID;
      const customerIdString = formData.customer_id || customerId;

      // Normalize source value
      const normalizeSourceValue = (source: string | null): string => {
        if (!source) return "Email";
        switch (source) {
          case "Email": return "Email";
          case "Phone": return "Phone";
          case "Site": return "Site";
          case "Physical": return "Physical";
          case "Τηλέφωνο": return "Phone";
          case "Ιστοσελίδα": return "Site";
          case "Φυσική παρουσία": return "Physical";
          case "Φυσική Παρουσία": return "Physical";
          default: 
            console.warn(` Unknown source value: "${source}". Defaulting to "Email".`);
            return "Email";
        }
      };

      if (offerId && !offerId.startsWith('temp-')) {
        // If we have a real offer ID, update the existing offer
        const updateData = {
          customer_id: String(customerIdString),
          offer_result: formData.offer_result || "wait_for_our_answer",
          result: formData.result || null,
          our_comments: formData.our_comments || null,
          customer_comments: formData.customer_comments || null,
          requirements: formData.requirements || null,
          amount: normalizeAmount(formData.amount),
          source: normalizeSourceValue(formData.source),
          address: formData.address || null,
          tk: formData.postal_code || null,
          town: formData.town || null,
          hma: !!formData.hma,
          certificate: formData.certificate || null,
          updated_by: safeUserId,
          updated_at: new Date().toISOString(),
          contact_id: selectedContactId,
          created_at: formData.created_at || new Date().toISOString(),
          assigned_to: formData.assigned_to || null
        };

        const { data, error } = await supabase
          .from("offers")
          .update(updateData as any)
          .eq("id", offerId)
          .select()
          .single();

        if (error) {
          console.error("Error updating offer:", error);
          setErrorMessage("Σφάλμα κατά την ενημέρωση προσφοράς");
          return null;
        }

        return data.id;
      } else {
        // Create new offer
        const insertData = {
          customer_id: String(customerIdString),
          offer_result: formData.offer_result || "wait_for_our_answer",
          result: formData.result || null,
          our_comments: formData.our_comments || null,
          customer_comments: formData.customer_comments || null,
          requirements: formData.requirements || null,
          amount: normalizeAmount(formData.amount),
          source: normalizeSourceValue(formData.source),
          address: formData.address || null,
          tk: formData.postal_code || null,
          town: formData.town || null,
          hma: !!formData.hma,
          certificate: formData.certificate || null,
          created_by: safeUserId,
          updated_by: safeUserId,
          created_at: formData.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          contact_id: selectedContactId,
          assigned_to: formData.assigned_to || null
        };

        const { data: newOffer, error } = await supabase
          .from('offers')
          .insert(insertData as any)
          .select()
          .single();

        if (error) {
          console.error("Error creating offer:", error);
          setErrorMessage("Σφάλμα κατά την δημιουργία προσφοράς");
          return null;
        }

        return newOffer.id;
      }
    } catch (error) {
      console.error("Error in saveOfferAndGetId:", error);
      setErrorMessage("Σφάλμα κατά την αποθήκευση προσφοράς");
      return null;
    }
  }, [offerId, customerId, user, selectedContactId, normalizeAmount]);

  // Use the date utilities
  const [currentDate, setCurrentDate] = useState(dateFormatUtils.formatCurrentDateTime());
  
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

  // Create reusable option mapping functions
  const createOptionMappers = (options: Array<{value: string, label: string}>) => {
    return {
      getLabel: (value: string) => options.find(option => option.value === value)?.label || value,
      getValue: (label: string) => options.find(option => option.label === label)?.value || label
    };
  };
  
  // Create mappers for each option type
  const sourceMappers = useMemo(() => createOptionMappers(sourceOptions), []);
  const statusMappers = useMemo(() => createOptionMappers(statusOptions), []);
  const resultMappers = useMemo(() => createOptionMappers(resultOptions), []);
  
  // Helper functions for source, status, and result - keep these for backward compatibility
  const getSourceLabel = useCallback((value: string) => {
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
  }, []);
  
  const getSourceValue = useCallback((label: string) => {
    switch (label) {
      case "Email":
        return "Email";
      case "Τηλέφωνο":
        return "Phone";
      case "Ιστοσελίδα":
      case "Site":
        return "Site";
      case "Φυσική παρουσία":
      case "Φυσική Παρουσία":
        return "Physical";
      default:
        return label;
    }
  }, []);

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
    const dateString = dateFormatUtils.formatCurrentDateTime();
    
    return {
      customer_id: String(customerId),
      created_at: dateString, // This is what will be saved to DB
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
      town: ""
    };
  }, [customerId, defaultSource, user?.id]);

  // Effect to set default values when the component mounts or when defaultSource changes
  useEffect(() => {
    if (defaultSource) {
      setValue('source', defaultSource);
    }
  }, [defaultSource, setValue]);
  
  // useEffect for form reset
  useEffect(() => {
    if (open) {
      reset({
        customer_id: customerId || '',
        created_at: dateFormatUtils.formatCurrentDateTime(),
        source: defaultSource || '',
        amount: '', // Ensure amount starts as empty string
        requirements: '',
        customer_comments: '',
        our_comments: '',
        offer_result: 'wait_for_our_answer',
        result: 'none',
        assigned_to: user?.id || '',
        hma: false,
        certificate: '',
        address: '',
        postal_code: '',
        town: '',
        status: 'active'
      });
      
      // Clear any errors
      setErrorMessage("");
    }
  }, [open, reset, customerId, defaultSource, user?.id]);

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

        if (error) {
          console.error('Error fetching customer data:', error);
          setErrorMessage("Σφάλμα κατά την ανάκτηση δεδομένων πελάτη");
          return;
        }
        
        if (data) {
          // Set customer name and phone
          setCustomerName(data.company_name);
          setCustomerPhone(data.telephone || "");
        }
      } catch (error) {
        console.error('Error in fetchCustomerData:', error);
        setErrorMessage("Σφάλμα κατά την ανάκτηση δεδομένων πελάτη");
      }
    };

    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  // Fetch offer data if editing
  const fetchOffer = useCallback(async () => {
    if (!offerId) return;
    
    setLoading(true);
    try {
      const { data: offer, error } = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .single() as { data: DatabaseOffer | null, error: any };

      if (error) {
        console.error('Error fetching offer:', error);
        setErrorMessage("Σφάλμα κατά την ανάκτηση προσφοράς");
        return;
      }

      if (offer) {
        reset({
          customer_id: offer.customer_id,
          created_at: dateFormatUtils.formatCurrentDateTime(offer.created_at),
          source: sourceMappers.getLabel(offer.source),
          amount: offer.amount?.toString() || '',
          requirements: offer.requirements || '',
          customer_comments: offer.customer_comments || '',
          our_comments: offer.our_comments || '',
          offer_result: offer.offer_result || 'wait_for_our_answer',
          result: offer.result || '',
          assigned_to: offer.assigned_to || '',
          hma: offer.hma || false,
          certificate: offer.certificate || '',
          address: offer.address || '',
          postal_code: offer.tk || '',
          town: offer.town || '',
          status: offer.status || ''
        });

        setSelectedContactId(offer.contact_id || null);
      }
    } catch (error) {
      console.error('Error in fetchOffer:', error);
      setErrorMessage("Σφάλμα κατά την ανάκτηση προσφοράς");
    } finally {
      setLoading(false);
    }
  }, [offerId, reset, sourceMappers]);

  useEffect(() => {
    if (offerId) {
      fetchOffer();
    } else {
      reset(defaultValues);
    }
  }, [offerId, fetchOffer, defaultValues, reset]);

  // Helper function to fetch contacts - extract this outside useEffect for reuse
  const fetchContacts = useCallback(async () => {
    if (!customerId) return;
    
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, full_name, position, created_at")
        .eq("customer_id", customerId)
        .eq("status", "active")
        .is("deleted_at", null);

      if (error) {
        console.error("Error fetching contacts:", error);
        setErrorMessage("Σφάλμα κατά την ανάκτηση επαφών");
        return;
      }
      
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
      console.error("Error in fetchContacts:", error);
      setErrorMessage("Σφάλμα κατά την ανάκτηση επαφών");
    }
  }, [customerId, selectedContactId]);

  // Fetch customer contacts
  useEffect(() => {
    if (open) {
      fetchContacts();
    }
  }, [open, fetchContacts]);

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

  // Add a ref to store the saveDetailsToDatabase function
  const saveDetailsToDatabaseRef = React.useRef<((realOfferId: string) => Promise<boolean>) | null>(null);
  
  // Store the save function persistently, outside of React's normal state flow
  // to ensure it doesn't get lost during rerenders
  const persistentSaveFnRef = React.useRef<((realOfferId: string) => Promise<boolean>) | null>(null);
  
  // Function to register the saveDetailsToDatabase function
  const registerSaveDetailsToDatabase = useCallback((saveFn: ((realOfferId: string) => Promise<boolean>) | null) => {
    if (saveFn === null) {
      return; // Don't clear the function, just ignore null assignments
    }
    
    // Store in the ref for immediate component use
    saveDetailsToDatabaseRef.current = saveFn;
    
    // Also store in a persistent ref that won't be affected by React's lifecycle
    persistentSaveFnRef.current = saveFn;
    
    // Update the global registry with an instanceId
    if (typeof window !== 'undefined') {
      // Initialize the global registry if it doesn't exist
      if (!window.offerDetailsSaveFunctions) {
        window.offerDetailsSaveFunctions = {};
      }
      
      // Add to global registry with the instance ID
      window.offerDetailsSaveFunctions[instanceId] = saveFn;
      
      // Update the global backup
      if (window._updateSaveDetailsFnBackup) {
        window._updateSaveDetailsFnBackup(saveFn);
      }
    }
  }, []); 

  // Create the context value with useMemo to optimize performance
  const contextValue = useMemo<OfferDialogContextType>(() => ({
    offerId: offerId || null,
    customerId,
    register,
    watch,
    setValue,
    control,
    formState,
    handleSubmit,
    reset,
    sourceOptions,
    getSourceLabel: sourceMappers.getLabel,
    getSourceValue: sourceMappers.getValue,
    statusOptions,
    getStatusLabel: statusMappers.getLabel,
    getStatusValue: statusMappers.getValue,
    resultOptions,
    getResultLabel: resultMappers.getLabel,
    getResultValue: resultMappers.getValue,
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
    register,
    watch,
    setValue,
    control,
    formState,
    handleSubmit,
    reset,
    sourceOptions,
    sourceMappers,
    statusOptions,
    statusMappers,
    resultOptions,
    resultMappers,
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

  // Form submit handler - actually save the offer
  const onSubmit = handleSubmit(async (data) => {
    if (formState.isSubmitting) return;
    
    try {
      setSubmitError(null);
      
      // Save offer data first
      const offerId = await saveOfferAndGetId(data);
      if (!offerId) {
        throw new Error('Failed to save offer');
      }

      // Save details if any
      const saveDetailsFn = saveDetailsToDatabaseRef.current;
      if (saveDetailsFn) {
        const detailsSaved = await saveDetailsFn(offerId);
        if (!detailsSaved) {
          throw new Error('Failed to save details');
        }
      }

      // Call onSave callback
      onSave?.(data);
      
      // Set success status
      setSubmitError(null);
      setSaveSuccess(true);
      
      // Auto-close after 200ms on success
      setTimeout(() => {
        onOpenChange(false);
      }, 200);
      
    } catch (error) {
      console.error('Error saving offer:', error);
      setSaveSuccess(false);
      setSubmitError(error instanceof Error ? error.message : 'Σφάλμα κατά την αποθήκευση της προσφοράς');
    }
  });

  const watchOfferResult = watch("offer_result");
  const watchResult = watch("result");
  const watchHma = watch("hma");
  
  // Add console log when form is fully loaded
  useEffect(() => {
    if (open) {
      // Check if key DOM elements are rendered
      setTimeout(() => {
        // Ensure amount is not accidentally set to a Greek translation of source
        // NOTE: The amount field is ALWAYS a string, never a number
        const currentAmount = watch("amount");
        if (typeof currentAmount === "string" && 
            (currentAmount === "Τηλέφωνο" || 
             currentAmount === "τηλέφωνο" || 
             currentAmount === "tilefono" || 
             currentAmount === "Phone")) {
          setValue("amount", "");
        }
      }, 100);
    }
  }, [open]); // Intentionally omitting watch and setValue to avoid re-runs

  // Helper function for initializing tooltips
  const initializeTooltips = useCallback(() => {
    // Initialize tooltips by ensuring all tooltip refs are set to mounted
    setTimeout(() => {
      document.querySelectorAll('[data-tooltip-mounted]').forEach(el => {
        try {
          if ((el as any).tooltipMountedRef) {
            (el as any).tooltipMountedRef.current = true;
          }
        } catch (e) {
          // Silent error
        }
      });
    }, 100);
  }, []);

  // If you're doing focus operations when the dialog opens
  useEffect(() => {
    if (open) {
      // Let the dialog render first
      requestAnimationFrame(() => {
        // Then focus in the next frame
        requestAnimationFrame(() => {
          const element = document.querySelector('.dialog-content input') as HTMLElement;
          if (element) element.focus();
          
          // Initialize tooltips by ensuring all tooltip refs are set to mounted
          document.querySelectorAll('[data-tooltip-mounted]').forEach(el => {
            try {
              if ((el as any).tooltipMountedRef) {
                (el as any).tooltipMountedRef.current = true;
              }
            } catch (e) {
              // Silent error
            }
          });
        });
      });
    }
  }, [open]);

  // Add state for date picker
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const dateButtonRef = useRef(null);
  const calendarRef = useRef(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  // Add state for calendar current month and year
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Toggle calendar
  const toggleCalendar = () => {
    if (!isCalendarOpen && dateButtonRef.current) {
      const rect = dateButtonRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX + (rect.width / 2) - 160 // 160 is half of 320px calendar width
      });
      setCalendarDate(new Date()); // Reset to current month when opening calendar
    }
    setIsCalendarOpen(!isCalendarOpen);
  };

  // Handle outside clicks for date picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isCalendarOpen &&
        dateButtonRef.current &&
        !dateButtonRef.current.contains(event.target as Node) &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Helper function for cleanup tooltips and dialog-related DOM elements
  const cleanupTooltipsAndPortals = useCallback(() => {
    try {
      // Find any tooltip portals in the DOM and remove them manually
      document.querySelectorAll('[data-radix-tooltip-portal]').forEach(portal => {
        try {
          if (portal.parentNode) {
            portal.parentNode.removeChild(portal);
          }
        } catch (e) {
          // Silent cleanup error
        }
      });
      
      // Make sure tooltips mounted refs are set to true
      document.querySelectorAll('[data-tooltip-mounted]').forEach(el => {
        try {
          if ((el as any).tooltipMountedRef) {
            (el as any).tooltipMountedRef.current = true;
          }
        } catch (e) {
          // Silent cleanup error
        }
      });
    } catch (e) {
      // Ignore any errors in cleanup
    }
  }, []);

  // Reset form to default values
  const resetForm = useCallback(() => {
    // Reset form with default values
    reset({
      customer_id: customerId,
      created_at: dateFormatUtils.formatCurrentDateTime(),
      source: defaultSource || "Email",
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
    });
    
    // Clear any errors
    setErrorMessage("");
    
    // Reset tabs if needed
    if (detailsTabReset) {
      detailsTabReset();
    }
  }, [customerId, defaultSource, user, reset, detailsTabReset]);

  return (
    <OfferDialogContext.Provider value={contextValue}>
      <ErrorBoundary fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-[#2f3e46] p-6 rounded-md shadow-lg border border-[#52796f] max-w-md">
            <h2 className="text-xl font-semibold text-[#cad2c5] mb-4">An error occurred</h2>
            <p className="text-[#cad2c5] mb-6">There was a problem loading the Offers Dialog. Please try again.</p>
            <button 
              onClick={() => onOpenChange(false)} 
              className="bg-[#52796f] text-[#cad2c5] px-4 py-2 rounded-md hover:bg-[#354f52]"
            >
              Close
            </button>
          </div>
        </div>
      }>
        <Dialog open={open} onOpenChange={(newOpen) => {
          // Only reset tabs when dialog is closing, not when opening
          if (open && !newOpen) {
            // Clean up tooltips before closing the dialog
            cleanupTooltipsAndPortals();
            
            // Wait a short time before resetting tabs
            setTimeout(() => {
              onOpenChange(false);
              if (detailsTabReset) detailsTabReset();
              if (onSave) onSave();
            }, 300);
            return;
          }
          
          onOpenChange(newOpen);
        }}>
          <DialogContent
            className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] max-w-5xl w-[85vw] max-h-[95vh] min-h-[720px] flex flex-col overflow-hidden p-0 gap-0"
            aria-labelledby="offer-dialog-title"
          >
            <DialogHeader className="px-6 pt-4">
              <DialogTitle id="offer-dialog-title" className="text-lg font-semibold text-[#cad2c5]">
              </DialogTitle>
            </DialogHeader>
            
            <div className="dialog-content">
              <form 
                onSubmit={onSubmit} 
                className="flex-1 flex flex-col overflow-hidden relative p-0 pb-16 pointer-events-auto"
              >
                {/* Header with customer name, phone, and title - outside of border */}
                <div className="flex items-center px-2 py-1 mx-10 mt-0">
                  <div className="flex items-center">
                    <div className="text-xl font-semibold">{customerName || "Πελάτης"}</div>
                    {customerPhone && (
                      <div className="text-sm text-gray-300 ml-2 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {customerPhone}
                      </div>
                    )}
                    <div className="mx-2 h-4 border-l border-gray-400"></div>
                    <div className="text-sm text-gray-300">
                      Νέα Προσφορά
                    </div>
                  </div>
                </div>

                {/* Border box with fields */}
                <div className="flex flex-col bg-[#354f52] border border-[#52796f] rounded-md mx-10 mb-2 mt-1">
                  {/* Source, Date, Contact controls inside border */}
                  <div className="flex justify-center px-3 py-3 gap-8">
                    {/* Source Field */}
                    <div className="flex items-center">
                      <div className="text-[#a8c5b5] text-sm mr-2 min-w-[45px]">
                        Πηγή:
                      </div>
                      <div className="min-w-[150px]">
                        <GlobalDropdown
                          options={sourceOptions.map(option => option.label)}
                          value={getSourceLabel(watch("source"))}
                          onSelect={(label) => setValue("source", getSourceValue(label))}
                          placeholder="Επιλέξτε πηγή"
                          className="bg-[#2a3b42] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
                        />
                      </div>
                    </div>
                    
                    {/* Date Field */}
                    <div className="flex items-center">
                      <div className="text-[#a8c5b5] text-sm mr-1">
                        Ημ/νία:
                      </div>
                      <div className="min-w-[170px] relative">
                        <button
                          ref={dateButtonRef}
                          type="button"
                          onClick={toggleCalendar}
                          className="bg-[#2a3b42] border border-[#52796f] text-[#cad2c5] h-8 w-full text-sm rounded-md px-3 text-left hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200 flex items-center justify-between"
                        >
                          <span className="truncate">{dateFormatUtils.formatDateDisplay(watch("created_at"))}</span>
                          <Calendar className="h-4 w-4 text-[#84a98c] flex-shrink-0" />
                        </button>
                        
                        {isCalendarOpen && (
                          <div 
                            ref={calendarRef}
                            className="absolute z-[100] mt-1 bg-[#2f3e46] border border-[#52796f] rounded-md shadow-lg p-2"
                            style={{ 
                              width: '320px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              top: '100%'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h2 id="calendar-dialog-title" className="sr-only">Επιλογή Ημερομηνίας</h2>
                            <div className="flex flex-col">
                              {/* Enhanced calendar with month navigation */}
                              <div className="mb-2">
                                {/* Month and year header with navigation */}
                                <div className="flex items-center justify-between mb-2">
                                  <button 
                                    type="button"
                                    className="text-[#84a98c] hover:text-[#cad2c5] px-2 py-1 text-lg font-semibold"
                                    onClick={() => {
                                      const newDate = new Date(calendarDate);
                                      newDate.setMonth(newDate.getMonth() - 1);
                                      setCalendarDate(newDate);
                                    }}
                                  >
                                    ‹
                                  </button>
                                  <div className="text-center text-[#cad2c5] font-semibold">
                                    {calendarDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                                  </div>
                                  <button 
                                    type="button"
                                    className="text-[#84a98c] hover:text-[#cad2c5] px-2 py-1 text-lg font-semibold"
                                    onClick={() => {
                                      const newDate = new Date(calendarDate);
                                      newDate.setMonth(newDate.getMonth() + 1);
                                      setCalendarDate(newDate);
                                    }}
                                  >
                                    ›
                                  </button>
                                </div>
                                
                                {/* Days of week */}
                                <div className="grid grid-cols-7 gap-1">
                                  {['Δε', 'Τρ', 'Τε', 'ΠΕ', 'Πα', 'Σα', 'Κυ'].map(day => (
                                    <div key={day} className="text-center text-[#84a98c] text-xs font-medium">
                                      {day}
                                    </div>
                                  ))}
                                </div>
                                  
                                {/* Calendar grid with previous/next month days */}
                                <div className="grid grid-cols-7 gap-1 mt-1">
                                  {(() => {
                                    const today = new Date();
                                    const currentMonth = calendarDate.getMonth();
                                    const currentYear = calendarDate.getFullYear();
                                    
                                    // Create date for first day of month
                                    const firstDay = new Date(currentYear, currentMonth, 1);
                                    // Get day of week (0 = Sunday, 1 = Monday, etc.)
                                    let firstDayOfWeek = firstDay.getDay();
                                    // Adjust for Monday start (0 = Monday, 6 = Sunday)
                                    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
                                    
                                    // Last day of current month
                                    const lastDay = new Date(currentYear, currentMonth + 1, 0);
                                    const daysInMonth = lastDay.getDate();
                                    
                                    // Get days from previous month
                                    const prevMonth = new Date(currentYear, currentMonth, 0);
                                    const prevMonthDays = prevMonth.getDate();
                                    
                                    // Calendar cells array
                                    const calendarCells = [];
                                    
                                    // Add days from previous month
                                    for (let i = 0; i < firstDayOfWeek; i++) {
                                      const day = prevMonthDays - firstDayOfWeek + i + 1;
                                      const date = new Date(currentYear, currentMonth - 1, day);
                                      calendarCells.push({
                                        day,
                                        date,
                                        type: 'prev-month'
                                      });
                                    }
                                    
                                    // Add days of current month
                                    for (let day = 1; day <= daysInMonth; day++) {
                                      const date = new Date(currentYear, currentMonth, day);
                                      const isToday = day === today.getDate() && 
                                                      currentMonth === today.getMonth() && 
                                                      currentYear === today.getFullYear();
                                      calendarCells.push({
                                        day,
                                        date,
                                        type: 'current-month',
                                        isToday
                                      });
                                    }
                                    
                                    // Add days from next month to fill the grid
                                    const totalCellsNeeded = 42; // 6 rows × 7 days
                                    const nextMonthDays = totalCellsNeeded - calendarCells.length;
                                    for (let day = 1; day <= nextMonthDays; day++) {
                                      const date = new Date(currentYear, currentMonth + 1, day);
                                      calendarCells.push({
                                        day,
                                        date,
                                        type: 'next-month'
                                      });
                                    }
                                    
                                    // Return the calendar cells
                                    return calendarCells.map((cell, index) => {
                                      let className = 'text-center py-1 text-xs h-6 w-6 mx-auto flex items-center justify-center';
                                      
                                      if (cell.type === 'current-month') {
                                        if (cell.isToday) {
                                          className += ' bg-[#52796f] text-white font-bold rounded-full';
                                        } else {
                                          className += ' text-[#cad2c5] hover:bg-[#52796f] hover:text-white hover:rounded-full';
                                        }
                                      } else {
                                        // Previous or next month days
                                        className += ' text-[#a8c5b5] opacity-50 hover:opacity-80 hover:bg-[#354f52] hover:rounded-full';
                                      }
                                      
                                      return (
                                        <button
                                          key={`cell-${index}`}
                                          type="button"
                                          onClick={() => {
                                            // Get current date value from form if exists
                                            const currentFormDate = watch("created_at");
                                            let selectedDate = new Date(cell.date);

                                            if (currentFormDate) {
                                              // If editing, preserve the existing time
                                              const existingDate = new Date(currentFormDate);
                                              selectedDate.setHours(
                                                existingDate.getHours(),
                                                existingDate.getMinutes(),
                                                existingDate.getSeconds(),
                                                existingDate.getMilliseconds()
                                              );
                                            } else {
                                              // If new offer, use current time
                                              const now = new Date();
                                              selectedDate.setHours(
                                                now.getHours(),
                                                now.getMinutes(),
                                                now.getSeconds(),
                                                0  // Reset milliseconds for consistency
                                              );
                                            }

                                            const dateString = selectedDate.toISOString();
                                            setValue("created_at", dateString);
                                            setIsCalendarOpen(false);
                                          }}
                                          className={className}
                                        >
                                          {cell.day}
                                        </button>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                              
                              {/* Today button */}
                              <div className="flex justify-center mt-2 border-t border-[#52796f] pt-2">
                                <button 
                                  type="button"
                                  className="text-[#84a98c] hover:text-[#cad2c5] text-xs px-2 py-1 rounded-md hover:bg-[#354f52]"
                                  onClick={() => {
                                    const today = new Date();
                                    const dateString = today.toISOString();
                                    setValue("created_at", dateString);
                                    setCalendarDate(today);
                                    setIsCalendarOpen(false);
                                  }}
                                >
                                  Σήμερα
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Contact Field */}
                    <div className="flex items-center">
                      <div className="text-[#a8c5b5] text-sm mr-2 min-w-[45px]">
                        Επαφή:
                      </div>
                      <div className="min-w-[170px]">
                        <div className="flex items-center">
                          <div className="flex-1 min-w-0">
                            <GlobalDropdown
                              options={contactOptions}
                              value={selectedContactId ? getContactDisplayNameById(selectedContactId) : ""}
                              onSelect={(value) => {
                                // Find the contact ID by display name
                                const foundContact = contacts.find(
                                  contact => contact.full_name === value
                                );
                                
                                if (foundContact) {
                                  setSelectedContactId(foundContact.id);
                                }
                              }}
                              placeholder="Επιλέξτε επαφή"
                              disabled={contactOptions.length === 0}
                              className="bg-[#2a3b42] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowContactDialog(true)}
                            className="ml-1 bg-transparent h-7 w-7 rounded-full flex items-center justify-center border border-[#f9c74f] hover:bg-[#354f52] transition-all duration-200 group"
                            aria-label="Add new contact"
                          >
                            <Plus className="h-4 w-4 text-[#f9c74f] group-hover:text-[#84a98c]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs below the header */}
                <AppTabs 
                  defaultValue="basic" 
                  className="app-tabs-container mt-2 px-10"
                  onValueChange={(value) => {
                    // Initialize tooltips by ensuring all tooltip refs are set to mounted
                    setTimeout(() => {
                      document.querySelectorAll('[data-tooltip-mounted]').forEach(el => {
                        try {
                          if ((el as any).tooltipMountedRef) {
                            (el as any).tooltipMountedRef.current = true;
                          }
                        } catch (e) {
                          // Silent error
                        }
                      });
                    }, 200);
                  }}
                >
                  <AppTabsList className="border-t-0">
                    <AppTabsTrigger value="basic">Βασικά Στοιχεία</AppTabsTrigger>
                    <AppTabsTrigger value="details">Λεπτομέρειες</AppTabsTrigger>
                  </AppTabsList>
                  
                  <div className="flex-1 relative" style={{ minHeight: '600px' }}>
                    {/* Tab 1: Basic Information */}
                    <AppTabsContent value="basic" className="absolute inset-0 pt-2 overflow-auto">
                      <BasicTab />
                    </AppTabsContent>
                    
                    {/* Tab 2: Details */}
                    <AppTabsContent value="details" className="absolute inset-0 pt-1 overflow-auto">
                      <DetailsTab />
                    </AppTabsContent>
                  </div>
                </AppTabs>
                
                <div className="absolute bottom-0 left-0 right-0 bg-[#2f3e46] border-t border-[#52796f] p-4 flex justify-end pr-24">
                  {submitError && (
                    <div className="text-red-400 mr-4">{submitError}</div>
                  )}
                  {saveSuccess && (
                    <div className="text-green-400 mr-4">Η προσφορά αποθηκεύτηκε επιτυχώς!</div>
                  )}
                  <Button 
                    type="submit"
                    disabled={formState.isSubmitting || saveSuccess}
                    className="bg-[#52796f] hover:bg-[#354f52] text-[#cad2c5] mr-2"
                  >
                    {formState.isSubmitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Αποθήκευση...
                      </span>
                    ) : 'Αποθήκευση'}
                  </Button>
                  <Button
                    type="button" 
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
                  >
                    {saveSuccess ? 'Κλείσιμο' : 'Ακύρωση'}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Add ContactDialog with proper accessibility attributes */}
        {showContactDialog && (
          <ContactDialog
            open={showContactDialog}
            onOpenChange={setShowContactDialog}
            customerId={customerId}
            contactId={selectedContact?.id}
            refreshData={fetchContacts}
          />
        )}
      </ErrorBoundary>
    </OfferDialogContext.Provider>
  );
});

export default OffersDialog;
