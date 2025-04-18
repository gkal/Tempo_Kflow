/**
 * Customer Form Component
 * Main component for adding/editing customers
 * Refactored to use modular components
 */

import React, { useState } from "react";
import { CustomerFormProvider } from "./CustomerFormProvider";
import { CustomerFormFields } from "./CustomerFormFields";
import { CustomerContactManagement } from "./CustomerContactManagement";
import { CustomerDuplicateDetection } from "./CustomerDuplicateDetection";
import { CustomerFormActions } from "./CustomerFormActions";
import { CustomerFormProps } from "./types/CustomerTypes";
import { createPrefixedLogger } from "@/utils/loggingUtils";

// Initialize logger
const logger = createPrefixedLogger('CustomerForm');

/**
 * CustomerForm component
 * Main customer form that uses all the extracted components
 */
export const CustomerForm: React.FC<CustomerFormProps> = ({
  customerId,
  onSave,
  onCancel,
  viewOnly = false,
  onValidityChange,
  onError,
  keepDialogOpen = false,
}) => {
  // State for tracking form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handler for save operation completion
  const handleSaveComplete = (newCustomerId?: string, companyName?: string) => {
    setIsSubmitting(false);
    if (onSave) {
      onSave(newCustomerId, companyName);
    }
  };
  
  // Handler for save operation start
  const handleSaveStart = () => {
    setIsSubmitting(true);
  };
  
  // Handler for errors during form operations
  const handleFormError = (errorMessage: string) => {
    setIsSubmitting(false);
    if (onError) {
      onError(errorMessage);
    }
  };

  return (
    <CustomerFormProvider
      customerId={customerId}
      viewOnly={viewOnly}
      onSave={handleSaveComplete}
      onCancel={onCancel}
      onValidityChange={onValidityChange}
      onError={handleFormError}
    >
      <div className="space-y-4">
        {/* Form fields section */}
        <CustomerFormFields viewOnly={viewOnly} />
        
        {/* Duplicate detection warning */}
        <CustomerDuplicateDetection />
        
        {/* Contact management section */}
        <CustomerContactManagement viewOnly={viewOnly} />
        
        {/* Form action buttons */}
        <CustomerFormActions
          onSave={handleSaveComplete}
          onCancel={onCancel}
          viewOnly={viewOnly}
          isSubmitting={isSubmitting}
        />
      </div>
    </CustomerFormProvider>
  );
};

export default CustomerForm; 
