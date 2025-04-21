import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import CustomerForm from "./CustomerForm";
import { CloseButton } from "@/components/ui/close-button";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FileText } from "lucide-react";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { AccessibleAlertDialogContent } from "@/components/ui/DialogUtilities";
import { supabase } from '@/lib/supabaseClient';
import { PlusIcon } from "lucide-react";
import { useFormRegistration } from '@/lib/FormContext';
import { useFormContext } from '@/lib/FormContext';
import { logDebug } from "@/utils/loggingUtils";
import { useNavigate } from "react-router-dom";

interface CustomerFormData {
  company_name?: string;
  customer_type?: string;
  afm?: string;
  doy?: string;
  address?: string;
  postal_code?: string;
  town?: string;
  telephone?: string;
  email?: string;
  webpage?: string;
  fax_number?: string;
  notes?: string;
  status?: string;
  [key: string]: any;
}

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  viewOnly?: boolean;
  onSave?: (newCustomerId?: string, companyName?: string) => Promise<void>;
  onCreateOffer?: () => void;
  customer?: any;
  refreshData?: () => void;
}

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function CustomerDialog({
  open,
  onOpenChange,
  customerId,
  viewOnly = false,
  onSave = async () => {},
  onCreateOffer,
  customer,
  refreshData,
}: CustomerDialogProps) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(!customer?.id);
  const [savedCustomerId, setSavedCustomerId] = useState<string | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedCustomerName, setSavedCustomerName] = useState<string>("");
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { registerForm } = useFormContext();

  useEffect(() => {
    if (open) {
      setSaving(false);
      setSuccess(false);
      setError(null);
      setIsNewCustomer(!customer?.id);
      setSavedCustomerId(null);
      setSavedCustomerName("");
      setShowContactDialog(false);
      setIsFormValid(false);
    }
  }, [open, customer]);

  useEffect(() => {
    // Format a more user-friendly form name
    const formName = customer?.name 
      ? `Customer: ${customer.name}`
      : customer?.company 
        ? `Customer: ${customer.company}`
        : 'New Customer';
        
    registerForm(formName);
    
    return () => registerForm(null);
  }, [customer, registerForm]);

  const handleSave = (newCustomerId?: string, companyName?: string) => {
    if (newCustomerId) {
      setSavedCustomerId(typeof newCustomerId === 'string' ? newCustomerId : String(newCustomerId));
      if (companyName) {
        setSavedCustomerName(companyName);
      }
      setSuccess(true);
      setSaving(false);
      
      if (isNewCustomer) {
        if (refreshData) {
          try {
            refreshData();
          } catch (err) {
            // Error handling without logging
          }
        }
        
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      } else {
        setTimeout(() => {
          onOpenChange(false);
          if (refreshData) {
            try {
              setTimeout(refreshData, 100);
            } catch (err) {
              // Error handling without logging
            }
          }
        }, 1500);
      }
    } else {
      const form = document.getElementById('customer-form') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        return;
      } else {
        setError("Αποτυχία αποθήκευσης πελάτη. Παρακαλώ δοκιμάστε ξανά.");
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleError = (errorMsg: string) => {
    if (errorMsg === "Failed to save customer. Please try again.") {
      setError("Αποτυχία αποθήκευσης πελάτη. Παρακαλώ δοκιμάστε ξανά.");
    } else if (errorMsg === "Failed to save customer. No ID returned.") {
      setError("Αποτυχία αποθήκευσης πελάτη. Δεν επιστράφηκε αναγνωριστικό.");
    } else {
      setError(errorMsg);
    }
  };

  const { user } = useAuth();
  const isAdminOrSuperUser = (user as any)?.user_metadata?.role === 'admin' || 
                            (user as any)?.user_metadata?.role === 'super_user';

  const handleFormSave = (newCustomerId?: string, companyName?: string) => {
    if (newCustomerId && !customerId) {
      setSavedCustomerId(newCustomerId);
    }
    
    if (onSave) {
      onSave(newCustomerId, companyName);
    }
  };

  const handleCreateOffer = () => {
    if (onCreateOffer) onCreateOffer();
  };

  const handleViewCustomer = () => {
    if (savedCustomerId) {
      navigate(`/customers/${savedCustomerId}`);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      setShowDeleteConfirmation(false);
      onOpenChange(false);
    } catch (error) {
      setError("Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormValidityChange = (valid: boolean) => {
    setIsFormValid(valid);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-4xl bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
          aria-describedby="customer-dialog-description"
          aria-labelledby="customer-dialog-title"
        >
          <div className="overflow-hidden">
            <DialogHeader className="pb-4">
              <DialogTitle id="customer-dialog-title" className="text-[#cad2c5] text-xl mb-2">
                {viewOnly
                  ? "Προβολή Πελάτη"
                  : customer?.id
                    ? "Επεξεργασία Πελάτη"
                    : "Νέος Πελάτης"}
              </DialogTitle>
              <DialogDescription id="customer-dialog-description" className="sr-only">
                {/* Description text removed, but keeping the element for accessibility */}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-auto pr-2">
              <CustomerForm
                customerId={customer?.id}
                onSave={handleSave}
                onCancel={handleCancel}
                onValidityChange={handleFormValidityChange}
                onError={handleError}
                keepDialogOpen={isNewCustomer}
              />
            </div>

            <div className="flex justify-between items-center pt-4 mt-4 border-t border-[#52796f]">
              <div className="flex-1 mr-4">
                {error && (
                  <div className="bg-red-500/10 text-red-400 p-2 rounded-md text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-500/10 text-green-400 p-2 rounded-md text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Η αποθήκευση ολοκληρώθηκε με επιτυχία!
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                {!viewOnly && (
                  <Button
                    onClick={(e) => handleSave()}
                    disabled={!isFormValid || saving}
                    className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Αποθήκευση...
                      </>
                    ) : (
                      "Αποθήκευση"
                    )}
                  </Button>
                )}
                
                {(customerId || savedCustomerId) && isAdminOrSuperUser && !viewOnly && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Διαγραφή
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="bg-transparent border-[#52796f] text-[#cad2c5] hover:bg-[#354f52]/20"
                >
                  Ακύρωση
                </Button>
              </div>
            </div>

            {showContactDialog && savedCustomerId && (
              <ContactDialog
                open={showContactDialog}
                onOpenChange={setShowContactDialog}
                customerId={savedCustomerId}
                refreshData={() => {
                  if (refreshData) {
                    try {
                      refreshData();
                    } catch (err) {
                      // Error handling without logging
                    }
                  }
                }}
              />
            )}

            <DeleteConfirmation
              isOpen={showDeleteConfirmation}
              onClose={() => setShowDeleteConfirmation(false)}
              onConfirm={confirmDelete}
              isDeleting={isDeleting}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  const { user } = useAuth();
  const canDelete = (user as any)?.user_metadata?.role === 'admin' || 
                   (user as any)?.user_metadata?.role === 'super_user';
  
  const descriptionId = "delete-customer-description";
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AccessibleAlertDialogContent
        title="Delete Customer"
        aria-describedby={descriptionId}
      >
        <AlertDialogHeader>
          <AlertDialogDescription id={descriptionId}>
            Are you sure you want to delete this customer? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AccessibleAlertDialogContent>
    </AlertDialog>
  );
};
