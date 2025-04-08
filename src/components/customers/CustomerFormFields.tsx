/**
 * CustomerFormFields component
 * Renders the form fields for the customer form
 * Extracted from CustomerForm.tsx to improve modularity
 */

import React, { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { formStyles } from "./utils/customerFormUtils";
import { CUSTOMER_TYPE_OPTIONS } from "./types/customerTypes";
import { useCustomerForm } from "./CustomerFormProvider";
import { validateCustomerForm, validateNotEmpty } from "./utils/customerValidation";
import { createPrefixedLogger } from "@/utils/loggingUtils";

// Initialize logger
const logger = createPrefixedLogger('CustomerFormFields');

// Add form styles to document
const addFormStyles = () => {
  const styleId = "customer-form-styles";
  
  // Only add if not already present
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = formStyles;
    document.head.appendChild(styleEl);
  }
};

// Interface for props
interface CustomerFormFieldsProps {
  viewOnly?: boolean;
}

export const CustomerFormFields: React.FC<CustomerFormFieldsProps> = ({
  viewOnly = false,
}) => {
  // Get form state and handlers from context
  const {
    formData,
    phoneValue,
    isValidationEnabled,
    handleInputChange,
    handlePhoneChange
  } = useCustomerForm();
  
  // Refs for inputs
  const companyNameRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  
  // Add custom form styles on mount
  useEffect(() => {
    addFormStyles();
    
    // Focus company name field on load when form is empty
    if (companyNameRef.current && !formData.company_name) {
      companyNameRef.current.focus();
    }
  }, []);
  
  // Calculate validation errors
  const errors = isValidationEnabled ? validateCustomerForm(formData, phoneValue) : {};
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
      {/* Company Name - Required */}
      <div className="mb-2">
        <Label htmlFor="company_name" className="text-[#84a98c] text-sm">
          Επωνυμία<span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          id="company_name"
          name="company_name"
          value={formData.company_name}
          onChange={handleInputChange}
          disabled={viewOnly}
          ref={companyNameRef}
          className={`w-full bg-[#2f3e46] text-[#cad2c5] focus:ring-[#52796f] ${
            errors.company_name ? "border-red-500" : "border-[#354f52]"
          }`}
        />
        {errors.company_name && (
          <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>
        )}
      </div>

      {/* Customer Type */}
      <div className="mb-2">
        <Label htmlFor="customer_type" className="text-[#84a98c] text-sm">
          Τύπος Πελάτη
        </Label>
        <GlobalDropdown
          id="customer_type"
          name="customer_type"
          value={formData.customer_type}
          onChange={handleInputChange}
          disabled={viewOnly}
          className="w-full bg-[#2f3e46] text-[#cad2c5] border-[#354f52]"
          options={CUSTOMER_TYPE_OPTIONS.map(type => ({ value: type, label: type }))}
          placeholder="Επιλέξτε τύπο"
        />
      </div>

      {/* Telephone - Required */}
      <div className="mb-2">
        <Label htmlFor="telephone" className="text-[#84a98c] text-sm">
          Τηλέφωνο<span className="text-red-500">*</span>
        </Label>
        <Input
          type="tel"
          id="telephone"
          name="telephone"
          value={phoneValue}
          onChange={(e) => handlePhoneChange(e)}
          disabled={viewOnly}
          ref={phoneInputRef}
          className={`w-full bg-[#2f3e46] text-[#cad2c5] focus:ring-[#52796f] ${
            errors.telephone ? "border-red-500" : "border-[#354f52]"
          }`}
        />
        {errors.telephone && (
          <p className="text-red-500 text-xs mt-1">{errors.telephone}</p>
        )}
      </div>

      {/* Email */}
      <div className="mb-2">
        <Label htmlFor="email" className="text-[#84a98c] text-sm">
          Email
        </Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          disabled={viewOnly}
          className={`w-full bg-[#2f3e46] text-[#cad2c5] focus:ring-[#52796f] ${
            errors.email ? "border-red-500" : "border-[#354f52]"
          }`}
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      {/* AFM */}
      <div className="mb-2">
        <Label htmlFor="afm" className="text-[#84a98c] text-sm">
          ΑΦΜ
        </Label>
        <Input
          type="text"
          id="afm"
          name="afm"
          value={formData.afm}
          onChange={handleInputChange}
          disabled={viewOnly}
          className={`w-full bg-[#2f3e46] text-[#cad2c5] focus:ring-[#52796f] ${
            errors.afm ? "border-red-500" : "border-[#354f52]"
          }`}
        />
        {errors.afm && (
          <p className="text-red-500 text-xs mt-1">{errors.afm}</p>
        )}
      </div>

      {/* DOY */}
      <div className="mb-2">
        <Label htmlFor="doy" className="text-[#84a98c] text-sm">
          ΔΟΥ
        </Label>
        <Input
          type="text"
          id="doy"
          name="doy"
          value={formData.doy}
          onChange={handleInputChange}
          disabled={viewOnly}
          className="w-full bg-[#2f3e46] text-[#cad2c5] border-[#354f52] focus:ring-[#52796f]"
        />
      </div>

      {/* Address */}
      <div className="mb-2">
        <Label htmlFor="address" className="text-[#84a98c] text-sm">
          Διεύθυνση
        </Label>
        <Input
          type="text"
          id="address"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          disabled={viewOnly}
          className="w-full bg-[#2f3e46] text-[#cad2c5] border-[#354f52] focus:ring-[#52796f]"
        />
      </div>

      {/* Postal Code */}
      <div className="mb-2">
        <Label htmlFor="postal_code" className="text-[#84a98c] text-sm">
          Τ.Κ.
        </Label>
        <Input
          type="text"
          id="postal_code"
          name="postal_code"
          value={formData.postal_code}
          onChange={handleInputChange}
          disabled={viewOnly}
          className="w-full bg-[#2f3e46] text-[#cad2c5] border-[#354f52] focus:ring-[#52796f]"
        />
      </div>

      {/* Town */}
      <div className="mb-2">
        <Label htmlFor="town" className="text-[#84a98c] text-sm">
          Πόλη
        </Label>
        <Input
          type="text"
          id="town"
          name="town"
          value={formData.town}
          onChange={handleInputChange}
          disabled={viewOnly}
          className="w-full bg-[#2f3e46] text-[#cad2c5] border-[#354f52] focus:ring-[#52796f]"
        />
      </div>

      {/* Webpage */}
      <div className="mb-2">
        <Label htmlFor="webpage" className="text-[#84a98c] text-sm">
          Ιστοσελίδα
        </Label>
        <Input
          type="text"
          id="webpage"
          name="webpage"
          value={formData.webpage}
          onChange={handleInputChange}
          disabled={viewOnly}
          className="w-full bg-[#2f3e46] text-[#cad2c5] border-[#354f52] focus:ring-[#52796f]"
        />
      </div>

      {/* Fax */}
      <div className="mb-2">
        <Label htmlFor="fax_number" className="text-[#84a98c] text-sm">
          Fax
        </Label>
        <Input
          type="text"
          id="fax_number"
          name="fax_number"
          value={formData.fax_number}
          onChange={handleInputChange}
          disabled={viewOnly}
          className="w-full bg-[#2f3e46] text-[#cad2c5] border-[#354f52] focus:ring-[#52796f]"
        />
      </div>

      {/* Notes - Full width */}
      <div className="mb-2 col-span-1 md:col-span-2">
        <Label htmlFor="notes" className="text-[#84a98c] text-sm">
          Σημειώσεις
        </Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          disabled={viewOnly}
          className="w-full bg-[#2f3e46] text-[#cad2c5] border-[#354f52] focus:ring-[#52796f] notes-textarea"
        />
      </div>
    </div>
  );
};