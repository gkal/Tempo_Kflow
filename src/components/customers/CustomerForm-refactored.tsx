/**
 * Customer Form Component
 * Main component for adding/editing customers
 * Refactored to use modular components
 */

import React, { useState, useEffect, useRef } from "react";
import { CustomerFormProvider } from "./CustomerFormProvider";
import CustomerFormFields from "./CustomerFormFields";
import { CustomerContactManagement } from "./CustomerContactManagement";
import { CustomerDuplicateDetection } from "./CustomerDuplicateDetection";
import { CustomerFormActions } from "./CustomerFormActions";
import { CustomerFormProps, CustomerFormSubmissionData, Customer } from "./types/CustomerTypes";
import { createPrefixedLogger } from "@/utils/loggingUtils";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/contacts/ContactDialog";
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
import { usePhoneFormat } from "@/hooks/usePhoneFormat";
import { useMountEffect } from "../../hooks/useMountEffect";
import { useLoading } from '@/lib/LoadingContext';
import { useDataService } from "@/hooks/useDataService";
import CustomerDetailDialog from './CustomerDetailDialog';
import { selectStyles, isFormValid, processFormDataForSubmission } from './utils/customerFormUtils';
import { findMatches } from './utils/duplicateDetection';
import { handleDeleteContact, setPrimaryContact as setPrimaryContactUtil } from './utils/contactManagement';
import PotentialMatchesTable from './PotentialMatchesTable';

// Initialize logger
const logger = createPrefixedLogger('CustomerForm');

/**
 * CustomerForm component
 * Main customer form that uses all the extracted components
 */
export const CustomerForm: React.FC<CustomerFormProps> = ({
  customerId: initialCustomerId,
  onSave,
  onCancel,
  viewOnly = false,
  onValidityChange,
  onError,
  keepDialogOpen = false,
}) => {
  const { showLoading, hideLoading } = useLoading();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tempCustomerType, setTempCustomerType] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CustomerFormSubmissionData>>({
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
  const { phoneValue, handlePhoneChange, setPhone, inputRef } = usePhoneFormat(formData.telephone || "");

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

  // Add state to track which field is currently active/focused
  const [activeField, setActiveField] = useState<string | null>(null);

  // Fetch customer data if editing
  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
      fetchContacts();
    }
  }, [customerId]);

  // Fetch customer data from API
  const fetchCustomerData = async () => {
    try {
      showLoading();
      
      // Use DataService to get customer data
      const customer = await getCustomerById(customerId, {
        select: "*, created_by:users!created_by(fullname), modified_by:users!modified_by(fullname)"
      });

      if (customer) {
        setFormData({
          company_name: customer.company_name || "",
          afm: customer.afm || "",
          doy: customer.doy || "",
          customer_type: customer.customer_type || "Εταιρεία",
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

  // Fetch contacts for this customer
  const fetchContacts = async () => {
    try {
      // Use DataService to get contacts
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

  // Set primary contact for the customer
  const setPrimaryContact = async (contactId: string) => {
    try {
      await setPrimaryContactUtil(customerId, contactId, updateCustomer);
      
      setFormData((prev) => ({
        ...prev,
        primary_contact_id: contactId,
      }));
    } catch (error) {
      console.error("Error setting primary contact:", error);
    }
  };

  // Handle input changes for all form fields
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

  // Update parent component about form validity whenever form data or phone value changes
  useEffect(() => {
    if (onValidityChange) {
      const valid = isFormValid(formData.company_name || "", phoneValue);
      onValidityChange(valid);
    }
  }, [formData, phoneValue, onValidityChange]);

  const [saveDisabled, setSaveDisabled] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading();
    try {
      // Check form validity before proceeding
      const valid = isFormValid(formData.company_name || "", phoneValue);
      if (!valid) {
        setError("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία");
        toast({
          variant: "destructive",
          title: "Σφάλμα επικύρωσης",
          description: "Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία: Επωνυμία και Τηλέφωνο"
        });
        return;
      }
      
      // Process form data for submission
      const submissionData = processFormDataForSubmission(
        formData, 
        phoneValue, 
        tempCustomerType, 
        user?.id, 
        customerId
      );
      
      setSaveDisabled(true);
      
      // If customerId is provided, update existing customer
      if (customerId) {
        // Use DataService for update
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
            onSave(newCustomerId, formData.company_name as string);
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

  // Handle contact selection
  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    setShowContactDialog(true);
  };

  // Handle contact deletion with confirmation
  const onDeleteContact = async (contact) => {
    setContactToDelete(contact);
    setShowDeleteDialog(true);
  };
  
  // Delete the contact after confirmation
  const deleteContact = async () => {
    if (!contactToDelete) return;
    
    setIsDeleting(true);
    const success = await handleDeleteContact(
      contactToDelete, 
      customerId, 
      formData.primary_contact_id || "", 
      updateCustomer, 
      softDeleteContact
    );
    
    if (success) {
      setIsDeleteSuccessful(true);
    }
    
    setIsDeleting(false);
  };
  
  // Close the delete dialog and update UI if successful
  const handleDeleteDialogClose = (open: boolean) => {
    // Only close if the dialog is being closed
    if (!open) {
      if (isDeleteSuccessful) {
        // Update UI after success and dialog close
        fetchContacts();
      }
      
      // Reset all dialog state
      setContactToDelete(null);
      setIsDeleteSuccessful(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle field focus events
  const handleFieldFocus = (fieldName: string) => {
    setActiveField(fieldName);
  };

  // Handle key field blur events to perform search
  const handleKeyFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const fieldId = e.target.id;
    
    // Set the active field
    setActiveField(fieldId);
    
    // Skip search if we're navigating to a customer or in edit mode
    if (navigatingToCustomer || customerId) {
      return;
    }
    
    // Trigger search based on field values
    performFieldSearches();
  };
  
  // Perform the duplicate searches based on current field values
  const performFieldSearches = async () => {
    // For phone, minimum 5 digits required for searching
    const phoneDigits = phoneValue ? phoneValue.replace(/\D/g, '').length : 0;
    const hasMinCompany = formData.company_name && formData.company_name.trim().length >= 2;
    const hasMinPhone = phoneDigits >= 5;
    
    if (hasMinCompany || hasMinPhone) {
      // Use unified matching function from utils
      const matches = await findMatches(
        formData.company_name || "", 
        phoneValue, 
        formData.afm || ""
      );
      setPotentialMatches(matches);
    } else {
      setPotentialMatches([]);
    }
  };

  // Effect for debounced search
  useEffect(() => {
    // Skip search if we're navigating or in edit mode
    if (!navigatingToCustomer && !customerId) {
      const searchTimeout = setTimeout(async () => {
        await performFieldSearches();
      }, 250);
      
      return () => clearTimeout(searchTimeout);
    } else {
      // Clear matches if we're navigating or in edit mode
      setPotentialMatches([]);
    }
  }, [phoneValue, formData.company_name, formData.afm, navigatingToCustomer, customerId, activeField]);

  // Handle phone field focus
  const handlePhoneFieldFocus = () => {
    handleFieldFocus('telephone');
  };

  // Select a potential duplicate match
  const onSelectMatch = (customerId: string, score?: number) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerScore(score);
    setDetailDialogOpen(true);
  };

  return (
    <CustomerFormProvider
      customerId={customerId}
      viewOnly={viewOnly}
      onSave={onSave}
      onCancel={onCancel}
      onValidityChange={onValidityChange}
      onError={onError}
    >
      <div className="space-y-4">
        {/* Form fields section */}
        <CustomerFormFields 
          formData={formData}
          phoneValue={phoneValue}
          inputRef={inputRef}
          contacts={contacts}
          customerId={customerId}
          primaryContactId={formData.primary_contact_id || ''}
          tempCustomerType={tempCustomerType}
          handleInputChange={handleInputChange}
          handleKeyFieldBlur={handleKeyFieldBlur}
          handleFieldFocus={handleFieldFocus}
          handlePhoneFieldFocus={handlePhoneFieldFocus}
          setPrimaryContact={setPrimaryContact}
          openContactDialog={() => setShowContactDialog(true)}
          onContactClick={handleContactClick}
          onDeleteContact={onDeleteContact}
          setTempCustomerType={setTempCustomerType}
          setFormData={setFormData}
          viewOnly={viewOnly}
          navigatingToCustomer={navigatingToCustomer}
        />
        
        {/* Duplicate detection warning */}
        <CustomerDuplicateDetection />
        
        {/* Contact management section */}
        <CustomerContactManagement viewOnly={viewOnly} />
        
        {/* Form action buttons */}
        <CustomerFormActions
          onSave={onSave}
          onCancel={onCancel}
          viewOnly={viewOnly}
          isSubmitting={saveDisabled}
        />
      </div>
    </CustomerFormProvider>
  );
};

export default CustomerForm; 
