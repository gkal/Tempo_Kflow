/*******************************************************************
 * ⚠️ CUSTOMER FORM COMPONENT - UNDER ACTIVE DEVELOPMENT ⚠️
 * Last updated: (Current Date)
 * 
 * This component is being updated to implement duplicate detection.
 * It handles:
 * - Customer creation and updates with proper user tracking (created_by/modified_by)
 * - Form validation and error handling
 * - Contact management integration
 * - Real-time updates
 * - Duplicate customer detection (in progress)
 *******************************************************************/

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from '@/lib/supabaseClient';
import { Search, Plus, ChevronDown, Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactDialog } from "@/components/contacts/ContactDialog";
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
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AccessibleAlertDialogContent } from "@/components/ui/DialogUtilities";
import { usePhoneFormat } from "@/hooks/usePhoneFormat";
import { validateRequired, validateEmail, validatePhone, validateMultiple } from "../../utils/validationUtils";
import { useMountEffect } from "../../hooks/useMountEffect";
import { createPrefixedLogger, logDebug, logError, logInfo, logWarning } from "@/utils/loggingUtils";
import { useLoading } from '@/lib/LoadingContext';
import { useDataService } from "@/hooks/useDataService";
import { useNavigate } from "react-router-dom";
import { findPotentialDuplicates } from '@/services/duplicateDetectionService';
import CustomerDetailDialog from './CustomerDetailDialog';

// Map of normalized customer types that match the database constraint
const CUSTOMER_TYPE_MAP = {
  "Εταιρεία": "Εταιρεία",
  "Ιδιώτης": "Ιδιώτης",
  "Δημόσιο": "Δημόσιο",
  "Οικοδομές": "Οικοδομές",
  "Εκτακτος Πελάτης": "Εκτακτος Πελάτης",
  "Εκτακτη Εταιρία": "Εκτακτη Εταιρία"
};

// List of valid customer types that satisfy the database check constraint
const VALID_CUSTOMER_TYPES = ["Εταιρεία", "Ιδιώτης", "Δημόσιο", "Οικοδομές", "Εκτακτος Πελάτης", "Εκτακτη Εταιρία"];

// Display options for customer types - these are what users see
const CUSTOMER_TYPE_OPTIONS = [
  "Εταιρεία", 
  "Ιδιώτης", 
  "Δημόσιο", 
  "Οικοδομές",
  "Εκτακτος Πελάτης",
  "Εκτακτη Εταιρία"
];

// Near the start of the file, update the CSS for the notes-textarea class
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

  .notes-textarea {
    height: 75px !important;
    min-height: 75px !important;
    max-height: 75px !important;
    padding: 5px 8px !important;
    resize: none !important;
    overflow-y: auto !important;
    line-height: 1.4 !important;
    font-size: 13px !important;
  }
`;

interface CustomerFormProps {
  customerId?: string;
  onSave?: (newCustomerId?: string, companyName?: string) => void;
  onCancel?: () => void;
  viewOnly?: boolean;
  onValidityChange?: (isValid: boolean) => void;
  onError?: (errorMessage: string) => void;
  keepDialogOpen?: boolean;
}

interface CustomerFormSubmissionData {
  customer_type: string;
  company_name: string;
  afm: string;
  doy: string;
  address: string;
  postal_code: string;
  town: string;
  telephone: string;
  email: string;
  webpage: string;
  fax_number: string;
  notes: string;
  primary_contact_id: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string | null;
  status?: string | null;
  deleted_at?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  created_by?: string;
  modified_by?: string;
}

// Add Customer interface before the component
interface Customer {
  id: string;
  company_name: string;
  telephone: string;
  afm: string;
  doy?: string;
  email?: string;
  address?: string;
  town?: string;
  postal_code?: string;
  deleted?: boolean;
  score?: number;
}

const CustomerForm = ({
  customerId: initialCustomerId,
  onSave,
  onCancel,
  viewOnly = false,
  onValidityChange,
  onError,
  keepDialogOpen = false,
}: CustomerFormProps) => {
  const { showLoading, hideLoading } = useLoading();
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

  // Phone formatting hook
  const { phoneValue, handlePhoneChange, setPhone, inputRef } = usePhoneFormat(formData.telephone);

  const [contacts, setContacts] = useState([]);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteSuccessful, setIsDeleteSuccessful] = useState(false);

  // Create a logger for this component
  const logger = createPrefixedLogger('CustomerForm');

  // Initialize the data services
  const { 
    data: customerData, 
    getById: getCustomerById, 
    create: createCustomer,
    update: updateCustomer
  } = useDataService<any>('customers');
  
  const {
    data: contactsData,
    fetchAll: fetchAllContacts,
    update: updateContact,
    softDelete: softDeleteContact
  } = useDataService<any>('contacts');

  // Add state for navigating to duplicate customer
  const [navigatingToCustomer, setNavigatingToCustomer] = useState(false);

  // Add potentialMatches state
  const [potentialMatches, setPotentialMatches] = useState<Customer[]>([]);
  
  // Add navigate
  const navigate = useNavigate();
  
  // Add state for customer detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerScore, setSelectedCustomerScore] = useState<number | undefined>(undefined);

  // Fetch customer data if editing
  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
      fetchContacts();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      showLoading();
      
      // Use DataService instead of direct supabase call
      const customer = await getCustomerById(customerId, {
        select: "*, created_by:users!created_by(fullname), modified_by:users!modified_by(fullname)"
      });

      if (customer) {
        setFormData({
          company_name: customer.company_name || "",
          afm: customer.afm || "",
          doy: customer.doy || "",
          customer_type: CUSTOMER_TYPE_MAP[customer.customer_type] || customer.customer_type || "Εταιρεία",
          address: customer.address || "",
          postal_code: customer.postal_code || "",
          town: customer.town || "",
          telephone: customer.telephone || "",
          email: customer.email || "",
          webpage: customer.webpage || "",
          fax_number: customer.fax_number || "",
          notes: customer.notes || "",
          primary_contact_id: customer.primary_contact_id || "",
        });
        // Update phone value in the custom hook
        setPhone(customer.telephone || "");
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
      setError("Σφάλμα κατά την ανάκτηση δεδομένων πελάτη");
    } finally {
      hideLoading();
    }
  };

  const fetchContacts = async () => {
    try {
      // Use DataService instead of direct supabase call
      const contacts = await fetchAllContacts({
        filters: {
          customer_id: customerId,
          status: "active",
          deleted_at: null
        }
      });

      setContacts(contacts || []);

      // Get the customer's primary contact ID from the already fetched customer data
      if (customerData && customerData.primary_contact_id) {
        setFormData((prev) => ({
          ...prev,
          primary_contact_id: customerData.primary_contact_id,
        }));
      } else if (contacts && contacts.length > 0) {
        // If no primary contact is set but contacts exist, set the first one as primary
        await setPrimaryContact(contacts[0].id);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const setPrimaryContact = async (contactId: string) => {
    try {
      // Use DataService instead of direct supabase call
      await updateCustomer(customerId, { primary_contact_id: contactId });
      
      setFormData((prev) => ({
        ...prev,
        primary_contact_id: contactId,
      }));
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
    
    // Special handling for telephone field
    if (name === "telephone") {
      // Cast to HTMLInputElement as handlePhoneChange expects that specific type
      const result = handlePhoneChange(e as React.ChangeEvent<HTMLInputElement>);
      setFormData((prev) => ({
        ...prev,
        telephone: result.value,
      }));
    } else {
      // Handle all other inputs normally
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const isFormValid = () => {
    // Get trimmed values for validation
    const companyNameValue = formData.company_name.trim();
    const telephoneValue = phoneValue.trim();
    
    // Check both required fields individually
    const hasCompanyName = companyNameValue !== '';
    const hasTelephone = telephoneValue !== '';
    
    // Both fields must be filled for the form to be valid
    return hasCompanyName && hasTelephone;
  };

  // Update parent component about form validity whenever form data or phone value changes
  useEffect(() => {
    if (onValidityChange) {
      const isValid = isFormValid();
      onValidityChange(isValid);
    }
  }, [formData, phoneValue, onValidityChange]);

  const [saveDisabled, setSaveDisabled] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading();
    try {
      // Check form validity before proceeding
      const valid = isFormValid();
      if (!valid) {
        setError("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία");
        return;
      }
      
      // Apply the temporary customer type immediately to ensure it's in formData
      const currentCustomerType = tempCustomerType !== null ? tempCustomerType : formData.customer_type;
      
      // CRITICAL FIX: Ensure customer_type is ALWAYS one of the allowed values BEFORE creating submission data
      const safeCustomerType = VALID_CUSTOMER_TYPES.includes(currentCustomerType) 
        ? currentCustomerType 
        : "Εταιρεία"; // Use a safe default value
      
      // Create a copy of the form data with the correct customer type and phone value
      const submissionData: CustomerFormSubmissionData = {
        ...formData,
        customer_type: safeCustomerType,
        // Use the phoneValue from hook which contains the correctly formatted number
        telephone: phoneValue,
        // For new records, ensure primary_contact_id is null, not empty string
        primary_contact_id: formData.primary_contact_id || null,
        // Add user IDs for tracking who created/modified the record
        ...(customerId ? { modified_by: user?.id } : { created_by: user?.id })
      };
      
      // Clean up the data before submission
      // Remove empty strings for fields that should be null
      Object.keys(submissionData).forEach(key => {
        if (submissionData[key] === "") {
          submissionData[key] = null;
        }
      });
      
      setSaveDisabled(true);
      
      // If customerId is provided, update existing customer
      if (customerId) {
        // Use DataService instead of direct supabase call
        const updatedCustomer = await updateCustomer(customerId, submissionData);
        
        if (updatedCustomer) {
          setSuccess(true);
          
          if (onSave) {
            onSave(customerId, formData.company_name);
          }
          
          // Dispatch a success event that other components can listen for
          dispatchEvent(new CustomEvent("customer-form-success"));
        }
      } else {
        // Create new customer using DataService
        const newCustomer = await createCustomer(submissionData);
        
        if (newCustomer) {
          setSuccess(true);
          
          // Get the ID of the newly created customer
          const newCustomerId = newCustomer.id;
          
          // Call onSave callback if provided
          if (onSave) {
            onSave(newCustomerId, formData.company_name);
          }
          
          // Dispatch a success event
          dispatchEvent(new CustomEvent("customer-form-success"));
        }
      }
      
      // Reset temporary customer type
      setTempCustomerType(null);
      
    } catch (error) {
      console.error('Error saving customer:', error);
      let errorMessage = error.message || 'An error occurred while saving the customer';
      
      // Provide a user-friendly error message
      if (errorMessage.includes('column') || errorMessage.includes('schema')) {
        errorMessage = 'Προέκυψε πρόβλημα με τη δομή της βάσης δεδομένων. Παρακαλώ επικοινωνήστε με το διαχειριστή.';
      } else if (errorMessage.includes('violates check constraint')) {
        errorMessage = 'Κάποιο από τα πεδία περιέχει μη έγκυρη τιμή. Παρακαλώ ελέγξτε τα δεδομένα σας.';
      } else if (errorMessage.includes('null value')) {
        errorMessage = 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.';
      }
      
      setSuccess(false);
      
      if (onError) {
        onError(errorMessage);
      }
      
      toast({
        title: "Σφάλμα",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaveDisabled(false);
      hideLoading();
    }
  };

  // Update the cleanup logic in the useEffect for the save button
  useEffect(() => {
    const saveButton = document.getElementById('save-customer-form');
    if (saveButton) {
      const originalClick = saveButton.onclick;
      saveButton.onclick = (e) => {
        if (originalClick) {
          return originalClick.call(saveButton, e);
        }
      };
    }
    
    return () => {
      // No need to manually remove the save button as it's part of the form
      // The form will be cleaned up by React's virtual DOM
    };
  }, []);

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    setShowContactDialog(true);
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    
    setIsDeleting(true);
    try {
      // Check if this is the primary contact
      if (contactToDelete.id === formData.primary_contact_id) {
        // Update customer to remove primary contact reference
        await updateCustomer(customerId, { primary_contact_id: null });
        
        // Also update local form data
        setFormData(prev => ({
          ...prev,
          primary_contact_id: ""
        }));
      }
      
      // Delete the contact using DataService soft delete
      await softDeleteContact(contactToDelete.id);
      
      // Show success state
      setIsDeleteSuccessful(true);
      
      // Don't update UI yet to prevent flashing before user sees success message
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Σφάλμα",
        description: "Προέκυψε σφάλμα κατά τη διαγραφή της επαφής.",
        variant: "destructive",
      });
      
      // Close dialog on error
      setShowDeleteDialog(false);
      setContactToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Update the cleanup logic in the handleDeleteDialogClose function
  const handleDeleteDialogClose = (open: boolean) => {
    // Only close if the dialog is being closed
    if (!open) {
      if (isDeleteSuccessful) {
        // Update UI after success and dialog close
        fetchContacts();
        
        // Show success toast
        toast({
          title: "Επιτυχία",
          description: "Η επαφή διαγράφηκε με επιτυχία.",
          variant: "default",
        });
      }
      
      // Reset all dialog state
      setContactToDelete(null);
      setIsDeleteSuccessful(false);
      setShowDeleteDialog(false);
    }
  };

  const handleHiddenSaveButtonClick = (e: React.MouseEvent) => {
    // Check both required fields explicitly
    const companyNameEmpty = !formData.company_name.trim();
    const telephoneEmpty = !phoneValue.trim();
    
    // Only proceed if both fields are filled
    if (!companyNameEmpty && !telephoneEmpty) {
      // Form is valid, proceed with submission
      handleSubmit(e as unknown as React.FormEvent);
    } else {
      // Prevent default and show error for invalid form
      e.preventDefault();
      
      // Show specific error message based on what's missing
      let errorMessage = "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία: ";
      if (companyNameEmpty && telephoneEmpty) {
        errorMessage += "Επωνυμία και Τηλέφωνο";
      } else if (companyNameEmpty) {
        errorMessage += "Επωνυμία";
      } else if (telephoneEmpty) {
        errorMessage += "Τηλέφωνο";
      }
      
      toast({
        variant: "destructive",
        title: "Σφάλμα επικύρωσης",
        description: errorMessage
      });
    }
  };

  // Create new customer with fallback for field errors - Replacing this function with DataService
  async function createNewCustomer(data: CustomerFormSubmissionData) {
    try {
      // Ensure customer_type is valid
      const safeCustomerType = VALID_CUSTOMER_TYPES.includes(data.customer_type) 
        ? data.customer_type 
        : "Εταιρεία";
      
      // Process data - convert empty strings to null
      const processedData = { ...data };
      Object.keys(processedData).forEach(key => {
        if (processedData[key] === "") {
          processedData[key] = null;
        }
      });
      
      // Use the DataService to create a new customer with only non-null values
      const basicCustomerData = {
        company_name: processedData.company_name,
        telephone: processedData.telephone,
        customer_type: safeCustomerType,
        // Include these only if they have non-null values
        ...(processedData.afm !== null ? { afm: processedData.afm } : {}),
        ...(processedData.doy !== null ? { doy: processedData.doy } : {}),
        ...(processedData.address !== null ? { address: processedData.address } : {}),
        ...(processedData.town !== null ? { town: processedData.town } : {}),
        ...(processedData.postal_code !== null ? { postal_code: processedData.postal_code } : {}),
        ...(processedData.email !== null ? { email: processedData.email } : {}),
        ...(processedData.webpage !== null ? { webpage: processedData.webpage } : {}),
        ...(processedData.fax_number !== null ? { fax_number: processedData.fax_number } : {}),
        ...(processedData.notes !== null ? { notes: processedData.notes } : {})
      };
      
      const newCustomer = await createCustomer(basicCustomerData);
        
      if (newCustomer) {
        return { data: [newCustomer], error: null };
      }
      
      throw new Error("Failed to create customer");
    } catch (insertError) {
      console.error('Customer creation failed:', insertError);
      
      // If first attempt fails, try with absolute minimal fields
      try {
        // Create minimal required data - only what's absolutely necessary
        const minimalFields = {
          company_name: data.company_name,
          telephone: data.telephone, 
          customer_type: "Εταιρεία"
        };
        
        const newCustomer = await createCustomer(minimalFields);
          
        if (newCustomer) {
          return { data: [newCustomer], error: null };
        }
        
        throw new Error("Failed to create customer with minimal fields");
      } catch (retryError) {
        console.error('All attempts failed:', retryError);
        return { data: null, error: retryError };
      }
    }
  }

  // Handle selection of a potential duplicate
  const handleSelectDuplicate = (duplicateId: string) => {
    // If we're already viewing a customer, don't navigate
    if (customerId) {
      toast({
        title: "Πληροφορία",
        description: "Δεν μπορείτε να μεταβείτε σε άλλο πελάτη κατά την επεξεργασία.",
      });
      return;
    }
    
    setNavigatingToCustomer(true);
    
    // Simulate navigation - in a real app, this might use a router
    // or dispatch an event that the parent component handles
    toast({
      title: "Μετάβαση σε υπάρχοντα πελάτη",
      description: "Μεταβαίνετε στη σελίδα του υπάρχοντος πελάτη...",
    });
    
    // Example of navigating to the duplicate customer
    // This could be handled by the parent component through a callback
    if (onSave) {
      onSave(duplicateId, "");
    }
  };

  // Add useEffect for duplicate detection
  useEffect(() => {
    const detectDuplicates = async () => {
      if (!formData.company_name || formData.company_name.trim().length < 3) {
        setPotentialMatches([]);
        return;
      }

      try {
        // Send both company name and telephone values
        // Our new scoring algorithm will prioritize name matches
        const matches = await findPotentialDuplicates({
          company_name: formData.company_name,
          telephone: phoneValue, // Use actual phone value instead of empty string
          afm: formData.afm || ''
        }, 75);
        
        setPotentialMatches(matches);
      } catch (error) {
        console.error('Error detecting duplicates:', error);
      }
    };

    const debounceTimeout = setTimeout(() => {
      detectDuplicates();
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [formData.company_name, formData.afm, phoneValue]); // Added phoneValue back as a dependency
  
  // Add onSelectMatch function
  const onSelectMatch = (customerId: string, score?: number) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerScore(score);
    setDetailDialogOpen(true);
  };

  return (
    <div className="h-full overflow-auto bg-[#2f3e46] text-[#cad2c5]">
      <style>
        {selectStyles}
      </style>
      <form
        id="customer-form"
        className="p-2 bg-[#2f3e46] text-[#cad2c5]"
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
        <div className="space-y-2 max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-2">
            {/* Account Information Section */}
            <div className="w-full md:w-1/2 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
              <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f]">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΣΤΟΙΧΕΙΑ ΠΕΛΑΤΗ
                </h2>
              </div>
              <div className="p-2">
                <div className="flex items-center" style={{ marginBottom: '12px' }}>
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
                      disabled={viewOnly || navigatingToCustomer}
                      required
                      autoComplete="off"
                      onInvalid={(e) => e.currentTarget.setCustomValidity('Παρακαλώ συμπληρώστε αυτό το πεδίο')}
                      onInput={(e) => e.currentTarget.setCustomValidity('')}
                    />
                  </div>
                </div>

                {/* Duplicate Detection Component - only show when creating a new customer */}
                {/* Removed as we're now showing matches in the Surprise section */}
                
                <div className="flex items-center" style={{ marginBottom: '12px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">
                    Τηλέφωνο <span className="text-red-500">*</span>
                  </div>
                  <div className="w-2/3">
                    <Input
                      id="telephone"
                      name="telephone"
                      value={phoneValue}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly || navigatingToCustomer}
                      required
                      autoComplete="off"
                      onInvalid={(e) => e.currentTarget.setCustomValidity('Παρακαλώ συμπληρώστε αυτό το πεδίο')}
                      onInput={(e) => e.currentTarget.setCustomValidity('')}
                      ref={inputRef}
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '12px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">ΑΦΜ</div>
                  <div className="w-2/3">
                    <Input
                      id="afm"
                      name="afm"
                      value={formData.afm}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly || navigatingToCustomer}
                      autoComplete="off"
                      pattern="[0-9]{8}"
                      maxLength={8}
                      minLength={8}
                      title="Το ΑΦΜ πρέπει να αποτελείται από 8 ψηφία"
                      placeholder="8 ψηφία"
                      onInvalid={(e) => e.currentTarget.setCustomValidity('Το ΑΦΜ πρέπει να αποτελείται από 8 ψηφία')}
                      onInput={(e) => e.currentTarget.setCustomValidity('')}
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '12px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Δ.Ο.Υ.</div>
                  <div className="w-2/3">
                    <Input
                      id="doy"
                      name="doy"
                      value={formData.doy}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly || navigatingToCustomer}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '12px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">
                    Τύπος Πελάτη
                  </div>
                  <div className="w-2/3">
                    <GlobalDropdown
                      options={CUSTOMER_TYPE_OPTIONS}
                      value={formData.customer_type}
                      onSelect={(value) => {
                        // Store the normalized value
                        const normalizedValue = CUSTOMER_TYPE_MAP[value] || value;
                        setTempCustomerType(normalizedValue);
                        // Also update the form data immediately
                        setFormData(prev => ({
                          ...prev,
                          customer_type: normalizedValue
                        }));
                      }}
                      placeholder="Επιλέξτε τύπο πελάτη"
                      formContext={true}
                      disabled={viewOnly || navigatingToCustomer}
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
                      disabled={viewOnly || navigatingToCustomer}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="w-full md:w-1/2 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
              <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f]">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΣΤΟΙΧΕΙΑ ΔΙΕΥΘΥΝΣΕΩΣ
                </h2>
              </div>
              <div className="p-2">
                <div className="flex items-center" style={{ marginBottom: '12px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Οδός</div>
                  <div className="w-3/4">
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly || navigatingToCustomer}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '12px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Πόλη</div>
                  <div className="w-3/4">
                    <Input
                      id="town"
                      name="town"
                      value={formData.town}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly || navigatingToCustomer}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ marginBottom: '12px' }}>
                  <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Τ.Κ.</div>
                  <div className="w-3/4">
                    <Input
                      id="postal_code"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleInputChange}
                      className="app-input"
                      disabled={viewOnly || navigatingToCustomer}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            {/* Company Contacts Section */}
            <div className="w-full md:w-1/2 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden h-[120px]">
              <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f] flex justify-between items-center">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΕΠΑΦΕΣ ΕΤΑΙΡΕΙΑΣ
                </h2>
                {customerId && (
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3e46] border border-yellow-600 rounded-full flex items-center justify-center"
                      onClick={() => {
                        setSelectedContact(null);
                        setShowContactDialog(true);
                      }}
                      disabled={viewOnly || navigatingToCustomer}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-2">
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
                    onDeleteContact={(contact) => {
                      setContactToDelete(contact);
                      setShowDeleteDialog(true);
                    }}
                    maxHeight="max-h-[55px]"
                  />
                ) : (
                  <div className="text-center py-3 text-[#a8c5b5]">
                    Αποθηκεύστε πρώτα τον πελάτη για να προσθέσετε επαφές.
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="w-full md:w-1/2 bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden h-[120px]">
              <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f]">
                <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                  ΣΗΜΕΙΩΣΕΙΣ
                </h2>
              </div>
              <div className="p-2 flex flex-col h-full">
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  className="customer-notes-textarea bg-[#2f3e46] text-[#cad2c5] placeholder:text-[#84a98c]/50 notes-textarea"
                  style={{
                    resize: 'none',
                    border: 'none'
                  }}
                  rows={1}
                  data-notes-textarea="true"
                  onChange={handleInputChange}
                  disabled={viewOnly || navigatingToCustomer}
                  placeholder="Προσθέστε σημειώσεις για τον πελάτη..."
                />
              </div>
            </div>
          </div>

          {/* Surprise Section - Full Width */}
          <div className="w-full bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden h-[140px]">
            <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f]">
              <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
                {potentialMatches && potentialMatches.length > 0 ? 'ΔΙΠΛΟΕΓΓΡΑΦΗ ΕΝΤΟΠΙΣΤΗΚΕ!' : 'SURPRISE!'}
              </h2>
            </div>
            <div className="p-2 h-[calc(100%-32px)] overflow-auto">
              {potentialMatches && potentialMatches.length > 0 ? (
                <div className="text-[#cad2c5]">
                  <table className="min-w-full divide-y divide-[#52796f]">
                    <thead className="bg-[#2f3e46]">
                      <tr>
                        <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Ομοιότητα</th>
                        <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Επωνυμία</th>
                        <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">ΑΦΜ</th>
                        <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Τηλέφωνο</th>
                        <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Email</th>
                        <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Διεύθυνση</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#2f3e46] divide-y divide-[#52796f]">
                      {potentialMatches.map((match) => (
                        <tr 
                          key={match.id}
                          className={`${match.deleted ? 'opacity-60' : ''} cursor-pointer hover:bg-[#354f52]`}
                          onClick={() => onSelectMatch(match.id, match.score)}
                        >
                          <td className="px-3 py-1 whitespace-nowrap text-xs">
                            <span className={`inline-block px-1.5 py-0.5 rounded-full ${
                              match.score && match.score >= 80
                                ? 'bg-red-200 text-red-800 dark:bg-red-700/50 dark:text-red-200'
                                : 'bg-amber-200 text-amber-800 dark:bg-amber-700/50 dark:text-amber-200'
                            }`}>
                              {match.score}%
                            </span>
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">
                            <div className="flex items-center">
                              <span className="font-medium">{match.company_name}</span>
                              {match.deleted && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-1 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-200">
                                  <Archive className="mr-1 h-3 w-3" />
                                  Διαγραμμένος
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">{match.afm}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">{match.telephone}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">{match.email || '-'}</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs">{match.address || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-[#cad2c5]">
                    Νέο τμήμα που θα υλοποιηθεί σύντομα!
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={showDeleteDialog} 
          onOpenChange={handleDeleteDialogClose}
        >
          <AlertDialogContent 
            aria-labelledby="delete-dialog-title" 
            aria-describedby="delete-contact-description"
            className="bg-[#2f3e46] border-[#52796f] text-white"
          >
            <AlertDialogHeader>
              <AlertDialogTitle id="delete-dialog-title" className="text-[#cad2c5]">
                {`${isDeleting ? "Διαγραφή" : "Επεξεργασία"} Επαφής`}
              </AlertDialogTitle>
              <AlertDialogDescription 
                id="delete-contact-description" 
                className="text-[#84a98c]"
              >
                {isDeleting ? (
                  <>
                    Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την επαφή;
                    <br />
                    <span className="text-red-400">
                      Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </span>
                  </>
                ) : (
                  "Θέλετε να αποθηκεύσετε τις αλλαγές σε αυτή την επαφή;"
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <div className="flex justify-end gap-2">
                <AlertDialogCancel 
                  onClick={() => handleDeleteDialogClose(false)}
                  className="bg-transparent border border-[#52796f] text-[#cad2c5] hover:bg-[#354f52] hover:text-[#cad2c5]"
                >
                  Άκυρο
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteContact}
                  className={`${
                    isDeleting 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "bg-[#52796f] hover:bg-[#354f52]"
                  } text-white`}
                >
                  {isDeleting ? "Διαγραφή" : "Αποθήκευση"}
                </AlertDialogAction>
              </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>

      {/* Contact Dialog */}
      {customerId && (
        <ContactDialog
          open={showContactDialog}
          onOpenChange={(open) => setShowContactDialog(open)}
          customerId={customerId || ""}
          contactId={selectedContact?.id}
          refreshData={async () => {
            if (typeof fetchContacts === 'function') {
              await fetchContacts();
            }
            return Promise.resolve();
          }}
        />
      )}
      
      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        customerId={selectedCustomerId}
        matchScore={selectedCustomerScore}
      />
    </div>
  );
};

export default CustomerForm;
