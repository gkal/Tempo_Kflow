/**
 * CustomerFormActions component
 * Handles the action buttons in the customer form
 * Extracted from CustomerForm.tsx to improve modularity
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { useCustomerForm } from "./CustomerFormProvider";

interface CustomerFormActionsProps {
  onSave?: (newCustomerId?: string, companyName?: string) => void;
  onCancel?: () => void;
  viewOnly?: boolean;
  isSubmitting?: boolean;
}

export const CustomerFormActions: React.FC<CustomerFormActionsProps> = ({
  onSave,
  onCancel,
  viewOnly = false,
  isSubmitting = false,
}) => {
  // Get form state from context
  const {
    formData,
    formIsValid,
    saveCustomer,
  } = useCustomerForm();

  // Handle save button click
  const handleSave = async () => {
    if (isSubmitting) return;
    
    try {
      // Call saveCustomer from the provider
      const savedCustomerId = await saveCustomer();
      
      // If onSave callback is provided, call it with the customerId
      if (savedCustomerId && onSave) {
        onSave(savedCustomerId, formData.company_name);
      }
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // If in view only mode, only show a close button
  if (viewOnly) {
    return (
      <div className="flex justify-end mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f] hover:bg-[#354f52]"
        >
          <X className="mr-2 h-4 w-4" /> Κλείσιμο
        </Button>
      </div>
    );
  }

  // Otherwise show save and cancel buttons
  return (
    <div className="flex justify-end space-x-2 mt-4">
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        className="bg-[#2f3e46] text-[#cad2c5] border-[#52796f] hover:bg-[#354f52]"
      >
        <X className="mr-2 h-4 w-4" /> Άκυρο
      </Button>
      <Button
        type="button"
        disabled={!formIsValid || isSubmitting}
        onClick={handleSave}
        className="bg-[#52796f] text-[#cad2c5] hover:bg-[#354f52] disabled:opacity-50"
      >
        <Save className="mr-2 h-4 w-4" />
        {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση"}
      </Button>
    </div>
  );
}; 