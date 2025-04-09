import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { validate as uuidValidate } from 'uuid';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AccessibleDialogContent } from '@/components/ui/DialogUtilities';

// Import our new components
import { AppTabs, AppTabsList, AppTabsTrigger, AppTabsContent } from "@/components/ui/app-tabs";
import DetailsTab from "./offer-dialog/DetailsTab";
import BasicTab from "./offer-dialog/BasicTab";
import DocumentsTab from "./offer-dialog/DocumentsTab";
import HeaderSection from './offer-dialog/HeaderSection';
import FormFooter from './offer-dialog/FormFooter';

// Import context, types, and utilities
import { OfferDialogContext, OffersDialogProps, OfferFormValues } from './offer-dialog/OfferDialogContext';
import { dateFormatUtils, createOptionMappers, formValidationUtils, cleanupTooltipsAndPortals, initializeTooltips } from './offer-dialog/FormUtils';
import { saveOfferAndGetId, fetchUsers, fetchCustomerData, fetchOffer, fetchContacts } from './offer-dialog/OffersService';

// Import styling
import './offer-dialog/OffersDialog.css';

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
      status: "active",
      waste_type: '',
      our_transport: '',
      client_transport: '',
      who_transport: true,
      loading: '',
      transport_type: ''
    }
  });
  
  // Form validation utilities
  const { isFormValid, normalizeAmount } = formValidationUtils(getValues, setError, setErrorMessage);

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

  // Create mappers for each option type
  const sourceMappers = useMemo(() => createOptionMappers(sourceOptions), []);
  const statusMappers = useMemo(() => createOptionMappers(statusOptions), []);
  const resultMappers = useMemo(() => createOptionMappers(resultOptions), []);

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
      town: "",
      waste_type: "",
      our_transport: "",
      client_transport: "",
      who_transport: true,
      loading: "",
      transport_type: ""
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
        status: 'active',
        waste_type: '',
        our_transport: '',
        client_transport: '',
        who_transport: true,
        loading: '',
        transport_type: ""
      });
      
      // Clear any errors
      setErrorMessage("");
    }
  }, [open, reset, customerId, defaultSource, user?.id]);

  // Fetch users for assignment dropdown
  useEffect(() => {
    fetchUsers(setUsers, setUserMap, setUserOptions, setErrorMessage);
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
    if (customerId && uuidValidate(customerId)) {
      fetchCustomerData(customerId, setCustomerName, setCustomerPhone, setErrorMessage);
    }
  }, [customerId]);

  // Fetch offer data if editing
  const fetchOfferData = useCallback(async () => {
    if (!offerId) return;
    await fetchOffer(offerId, reset, setSelectedContactId, dateFormatUtils, sourceMappers, setErrorMessage, setLoading);
  }, [offerId, reset, sourceMappers]);

  useEffect(() => {
    if (offerId) {
      fetchOfferData();
    } else {
      reset(defaultValues);
    }
  }, [offerId, fetchOfferData, defaultValues, reset]);

  // Fetch customer contacts
  useEffect(() => {
    if (open) {
      fetchContacts(
        customerId, 
        setContacts, 
        setContactMap, 
        setContactDisplayMap, 
        setContactOptions, 
        setSelectedContactId, 
        selectedContactId, 
        setErrorMessage
      );
    }
  }, [open, customerId, selectedContactId]);

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
  const contextValue = useMemo(() => ({
    offerId: offerId || null,
    customerId,
    customerName,
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
    customerName,
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

  // Update contact options to only include full name
  useEffect(() => {
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
      const savedOfferId = await saveOfferAndGetId(
        data, 
        offerId, 
        customerId, 
        selectedContactId, 
        user?.id,
        normalizeAmount,
        setErrorMessage
      );
      
      if (!savedOfferId) {
        throw new Error('Failed to save offer');
      }

      // Save details if any
      const saveDetailsFn = saveDetailsToDatabaseRef.current;
      if (saveDetailsFn) {
        const detailsSaved = await saveDetailsFn(savedOfferId);
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

  // If you're doing focus operations when the dialog opens
  useEffect(() => {
    if (open) {
      // Let the dialog render first
      requestAnimationFrame(() => {
        // Then focus in the next frame
        requestAnimationFrame(() => {
          const element = document.querySelector('.dialog-content input') as HTMLElement;
          if (element) element.focus();
          
          // Initialize tooltips
          initializeTooltips();
        });
      });
    }
  }, [open]);

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
      status: "active",
      waste_type: "",
      our_transport: "",
      client_transport: "",
      who_transport: true,
      loading: "",
      transport_type: ""
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
                {/* Header Section with customer info, source, date and contact fields */}
                <HeaderSection 
                  customerName={customerName}
                  customerPhone={customerPhone}
                  contacts={contacts}
                  contactOptions={contactOptions}
                  selectedContactId={selectedContactId}
                  setSelectedContactId={setSelectedContactId}
                  setShowContactDialog={setShowContactDialog}
                  getContactDisplayNameById={getContactDisplayNameById}
                />

                {/* Tabs below the header */}
                <AppTabs 
                  defaultValue="basic" 
                  className="app-tabs-container mt-2 px-10"
                  onValueChange={(value) => {
                    // Initialize tooltips by ensuring all tooltip refs are set to mounted
                    initializeTooltips();
                  }}
                >
                  <AppTabsList className="border-t-0">
                    <AppTabsTrigger value="basic">Βασικά Στοιχεία</AppTabsTrigger>
                    <AppTabsTrigger value="details">Λεπτομέρειες</AppTabsTrigger>
                    <AppTabsTrigger value="documents">Έγγραφα</AppTabsTrigger>
                  </AppTabsList>
                  
                  <div className="flex-1 relative" style={{ minHeight: '600px', pointerEvents: 'auto' }}>
                    {/* Tab 1: Basic Information */}
                    <AppTabsContent value="basic" className="absolute inset-0 pt-2 overflow-auto pointer-events-auto">
                      <BasicTab />
                    </AppTabsContent>
                    
                    {/* Tab 2: Details */}
                    <AppTabsContent value="details" className="absolute inset-0 pt-1 overflow-auto pointer-events-auto" style={{ position: 'relative' }}>
                      <DetailsTab />
                    </AppTabsContent>

                    {/* Tab 3: Documents */}
                    <AppTabsContent value="documents" className="absolute inset-0 pt-1 overflow-auto pointer-events-auto">
                      <DocumentsTab />
                    </AppTabsContent>
                  </div>
                </AppTabs>
                
                {/* Form footer with save and cancel buttons */}
                <FormFooter 
                  isSubmitting={formState.isSubmitting}
                  submitError={submitError}
                  saveSuccess={saveSuccess}
                  onClose={() => onOpenChange(false)}
                />
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
            refreshData={() => fetchContacts(
              customerId, 
              setContacts, 
              setContactMap, 
              setContactDisplayMap, 
              setContactOptions, 
              setSelectedContactId, 
              selectedContactId, 
              setErrorMessage
            )}
          />
        )}
      </ErrorBoundary>
    </OfferDialogContext.Provider>
  );
});

export default OffersDialog;
