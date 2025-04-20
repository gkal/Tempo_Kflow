/**
 * CustomerFormFields component
 * Renders the form fields for the customer form
 * Extracted from CustomerForm.tsx to improve modularity
 */

import React, { useRef, useEffect, RefObject } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { formStyles } from "./utils/customerFormUtils";
import { CUSTOMER_TYPE_OPTIONS } from "./types/CustomerTypes";
import { useCustomerForm } from "./CustomerFormProvider";
import { validateCustomerForm, validateNotEmpty } from "./utils/customerValidation";
import { createPrefixedLogger } from "@/utils/loggingUtils";
import { ContactList } from "@/components/contacts/ContactList";
import { Plus } from "lucide-react";
import { CustomerFormSubmissionData, CustomerFormData } from './types/CustomerTypes';

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
  formData: Partial<CustomerFormSubmissionData>;
  phoneValue: string;
  inputRef: RefObject<HTMLInputElement>;
  contacts: any[];
  customerId?: string;
  primaryContactId: string;
  tempCustomerType: string | null;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleKeyFieldBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleFieldFocus: (fieldName: string) => void;
  handlePhoneFieldFocus: () => void;
  setPrimaryContact: (contactId: string) => Promise<void>;
  openContactDialog: () => void;
  onContactClick: (contact: any) => void;
  onDeleteContact: (contact: any) => void;
  setTempCustomerType: (value: string | null) => void;
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerFormSubmissionData>>>;
  viewOnly?: boolean;
  navigatingToCustomer?: boolean;
}

const CustomerFormFields: React.FC<CustomerFormFieldsProps> = ({
  formData,
  phoneValue,
  inputRef,
  contacts,
  customerId,
  primaryContactId,
  tempCustomerType,
  handleInputChange,
  handleKeyFieldBlur,
  handleFieldFocus,
  handlePhoneFieldFocus,
  setPrimaryContact,
  openContactDialog,
  onContactClick,
  onDeleteContact,
  setTempCustomerType,
  setFormData,
  viewOnly = false,
  navigatingToCustomer = false
}) => {
  // Get form state and handlers from context
  const {
    isValidationEnabled,
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
  const errors = isValidationEnabled ? validateCustomerForm(formData as CustomerFormData, phoneValue) : {};
  
  return (
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
                  value={formData.company_name || ''}
                  onChange={handleInputChange}
                  onBlur={handleKeyFieldBlur}
                  onFocus={() => handleFieldFocus('company_name')}
                  className="app-input"
                  disabled={viewOnly || navigatingToCustomer}
                  required
                  autoComplete="off"
                  onInvalid={(e) => e.currentTarget.setCustomValidity('Παρακαλώ συμπληρώστε αυτό το πεδίο')}
                  onInput={(e) => e.currentTarget.setCustomValidity('')}
                />
              </div>
            </div>

            <div className="flex items-center" style={{ marginBottom: '12px' }}>
              <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">
                Τηλέφωνο <span className="text-red-500">*</span>
              </div>
              <div className="w-2/3">
                <Input
                  id="telephone"
                  name="telephone"
                  value={phoneValue}
                  onChange={(e) => handlePhoneChange(e)}
                  onBlur={handleKeyFieldBlur}
                  onFocus={handlePhoneFieldFocus}
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
                  value={formData.afm || ''}
                  onChange={handleInputChange}
                  onBlur={handleKeyFieldBlur}
                  onFocus={() => handleFieldFocus('afm')}
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
                  // Restrict input to digits only
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center" style={{ marginBottom: '12px' }}>
              <div className="w-1/4 text-[#a8c5b5] text-sm pr-1">Δ.Ο.Υ.</div>
              <div className="w-2/3">
                <Input
                  id="doy"
                  name="doy"
                  value={formData.doy || ''}
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
                  value={formData.customer_type || ''}
                  onSelect={(value) => {
                    // Store the normalized value
                    setTempCustomerType(value);
                    // Also update the form data immediately
                    setFormData(prev => ({
                      ...prev,
                      customer_type: value
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
                  value={formData.email || ''}
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
                  value={formData.address || ''}
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
                  value={formData.town || ''}
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
                  value={formData.postal_code || ''}
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
                  onClick={openContactDialog}
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
                primaryContactId={primaryContactId}
                onContactClick={onContactClick}
                onAddContact={openContactDialog}
                onSetPrimary={setPrimaryContact}
                onDeleteContact={onDeleteContact}
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
              value={formData.notes || ''}
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
    </div>
  );
};

export default CustomerFormFields;

