/**
 * Customer Form Provider
 * Manages state for the CustomerForm component
 * Extracted from CustomerForm.tsx to improve modularity
 */

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { useLoading } from '@/lib/LoadingContext';
import { useDataService } from "@/hooks/useDataService";
import { usePhoneFormat } from "@/hooks/usePhoneFormat";
import { useNavigate } from "react-router-dom";
import * as duplicateDetectionService from '@/services/duplicate-detection';
import { supabase } from '@/lib/supabaseClient';
import { CustomerFormData, Customer } from './types/CustomerTypes';
import { isFormValid } from './utils/customerValidation';
import { customerToFormData, getInitialFormData } from './utils/customerFormUtils';
import { createPrefixedLogger } from '@/utils/loggingUtils';

// Initialize logger
const logger = createPrefixedLogger('CustomerFormProvider');

// Define the context type
interface CustomerFormContextType {
  // Basic form state
  customerId: string | undefined;
  formData: CustomerFormData;
  phoneValue: string;
  viewOnly: boolean;
  loading: boolean;
  error: string;
  success: boolean;
  
  // Contacts state
  contacts: any[];
  selectedContact: any;
  showContactDialog: boolean;
  contactToDelete: any;
  showDeleteDialog: boolean;
  isDeleting: boolean;
  isDeleteSuccessful: boolean;
  
  // Duplicate detection state
  potentialMatches: Customer[];
  detailDialogOpen: boolean;
  selectedCustomerId: string | null;
  selectedCustomerScore: number | undefined;
  navigatingToCustomer: boolean;
  
  // Form state handlers
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => { value: string; formattedValue: string; };
  
  // Contact handlers
  setContacts: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedContact: React.Dispatch<React.SetStateAction<any>>;
  setShowContactDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setContactToDelete: React.Dispatch<React.SetStateAction<any>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  handleContactSelect: (contact: any) => void;
  
  // Duplicate detection handlers
  setPotentialMatches: React.Dispatch<React.SetStateAction<Customer[]>>;
  setDetailDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCustomerId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCustomerScore: React.Dispatch<React.SetStateAction<number | undefined>>;
  handleViewCustomer: (customerId: string) => void;
  
  // Form status
  formIsValid: boolean;
  isValidationEnabled: boolean;
  
  // Actions
  fetchCustomerData: () => Promise<void>;
  fetchContacts: () => Promise<void>;
  setPrimaryContact: (contactId: string) => Promise<void>;
  saveCustomer: () => Promise<string | undefined>;
}

// Create the context
const CustomerFormContext = createContext<CustomerFormContextType | undefined>(undefined);

// Provider props
interface CustomerFormProviderProps {
  children: ReactNode;
  customerId?: string;
  viewOnly?: boolean;
  onSave?: (newCustomerId?: string, companyName?: string) => void;
  onCancel?: () => void;
  onValidityChange?: (isValid: boolean) => void;
  onError?: (errorMessage: string) => void;
}

// Hook for using this context
export const useCustomerForm = () => {
  const context = useContext(CustomerFormContext);
  if (context === undefined) {
    throw new Error('useCustomerForm must be used within a CustomerFormProvider');
  }
  return context;
};

// Provider component
export const CustomerFormProvider: React.FC<CustomerFormProviderProps> = ({
  children,
  customerId: initialCustomerId,
  viewOnly = false,
  onSave,
  onCancel,
  onValidityChange,
  onError,
}) => {
  const { showLoading, hideLoading } = useLoading();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>(getInitialFormData());
  const navigate = useNavigate();

  // Phone formatting hook
  const { phoneValue, handlePhoneChange, setPhone, inputRef } = usePhoneFormat(formData.telephone);

  // State for contacts
  const [contacts, setContacts] = useState([]);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteSuccessful, setIsDeleteSuccessful] = useState(false);

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

  // State for duplicate detection
  const [potentialMatches, setPotentialMatches] = useState<Customer[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerScore, setSelectedCustomerScore] = useState<number | undefined>(undefined);
  const [navigatingToCustomer, setNavigatingToCustomer] = useState(false);
  
  // Validation state
  const [isValidationEnabled, setIsValidationEnabled] = useState(false);
  
  // Fetch customer data if editing
  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
      fetchContacts();
    }
  }, [customerId]);

  // Update parent about form validity whenever relevant state changes
  useEffect(() => {
    if (onValidityChange) {
      const valid = isFormValid(formData, phoneValue);
      onValidityChange(valid);
    }
  }, [formData, phoneValue, onValidityChange]);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    
    // Special handling for telephone field
    if (name === "telephone") {
      // Cast to HTMLInputElement as handlePhoneChange expects that specific type
      const phoneInput = e as React.ChangeEvent<HTMLInputElement>;
      const phoneResult = {
        value: phoneInput.target.value,
        formattedValue: phoneInput.target.value
      };
      
      setFormData((prev) => ({
        ...prev,
        telephone: phoneResult.value,
      }));
    } else {
      // Handle all other inputs normally
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Fetch customer data
  const fetchCustomerData = async () => {
    try {
      showLoading();
      
      // Use DataService instead of direct supabase call
      const customer = await getCustomerById(customerId, {
        select: "*, created_by:users!created_by(fullname), modified_by:users!modified_by(fullname)"
      });

      if (customer) {
        setFormData(customerToFormData(customer));
        
        // Update phone value in the custom hook
        setPhone(customer.telephone || "");
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
      setError("Σφάλμα κατά την ανάκτηση δεδομένων πελάτη");
      if (onError) onError("Σφάλμα κατά την ανάκτηση δεδομένων πελάτη");
    } finally {
      hideLoading();
    }
  };

  // Fetch contacts for this customer
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

  // Set primary contact
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

  // Handle contact selection
  const handleContactSelect = (contact: any) => {
    setSelectedContact(contact);
  };

  // Handle viewing a customer
  const handleViewCustomer = (customerId: string) => {
    setNavigatingToCustomer(true);
    navigate(`/customers/${customerId}`);
  };

  // Save customer
  const saveCustomer = async (): Promise<string | undefined> => {
    // Form validation happens here as needed
    setIsValidationEnabled(true);
    if (!isFormValid(formData, phoneValue)) {
      setError("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία");
      if (onError) onError("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία");
      return undefined;
    }
    
    // Implementation of customer saving logic would go here
    // This would use the createCustomer and updateCustomer functions
    // from the useDataService hook
    
    // For now, return the customerId as a placeholder
    return customerId;
  };

  // Calculate form validity
  const formIsValid = isFormValid(formData, phoneValue);

  // Create the context value
  const contextValue: CustomerFormContextType = {
    // Basic form state
    customerId,
    formData,
    phoneValue,
    viewOnly,
    loading,
    error,
    success,
    
    // Contacts state
    contacts,
    selectedContact,
    showContactDialog,
    contactToDelete,
    showDeleteDialog,
    isDeleting,
    isDeleteSuccessful,
    
    // Duplicate detection state
    potentialMatches,
    detailDialogOpen,
    selectedCustomerId,
    selectedCustomerScore,
    navigatingToCustomer,
    
    // Form state handlers
    setFormData,
    handleInputChange,
    handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      return {
        value, 
        formattedValue: value
      };
    },
    
    // Contact handlers
    setContacts,
    setSelectedContact,
    setShowContactDialog,
    setContactToDelete,
    setShowDeleteDialog,
    handleContactSelect,
    
    // Duplicate detection handlers
    setPotentialMatches,
    setDetailDialogOpen,
    setSelectedCustomerId,
    setSelectedCustomerScore,
    handleViewCustomer,
    
    // Form status
    formIsValid,
    isValidationEnabled,
    
    // Actions
    fetchCustomerData,
    fetchContacts,
    setPrimaryContact,
    saveCustomer
  };

  return (
    <CustomerFormContext.Provider value={contextValue}>
      {children}
    </CustomerFormContext.Provider>
  );
}; 
