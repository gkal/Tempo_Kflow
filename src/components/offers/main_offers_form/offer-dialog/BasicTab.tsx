import React, { useContext, CSSProperties, useEffect, useState, useRef } from 'react';
import { OfferDialogContext } from './OfferDialogContext';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Phone, Calendar } from "lucide-react";
import { DayPicker } from 'react-day-picker';
import { el } from 'date-fns/locale';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { createPortal } from 'react-dom';
import { useFormWatch } from "@/utils/formHelpers";

/**
 * Type definition for context properties we need but aren't in the original interface
 */
interface ExtendedContextType {
  customerName?: string;
  customerPhone?: string;
  contactOptions?: string[];
  selectedContactId?: string | null;
  setSelectedContactId?: (id: string | null) => void;
  getContactNameById?: (id: string) => string;
  getContactDisplayNameById?: (id: string) => string;
  setShowContactDialog?: (show: boolean) => void;
  contactDisplayMap?: Record<string, string>;
  contacts?: any[];
  
  // Other properties we know exist in the context
  register: any;
  watch: any;
  setValue: any;
  control: any;
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
  formState: any;
}

/**
 * BasicTab component that combines all sections from the first tab in OffersDialog:
 * - DialogHeaderSection
 * - BasicInfoSection
 * - RequirementsSection
 * - StatusSection
 * - CommentsSection
 * 
 * Each section is clearly separated with its own styling and header.
 */
const BasicTab = () => {
  const context = useContext(OfferDialogContext) as ExtendedContextType | null;
  
  if (!context) {
    return (
      <div className="p-4 text-center text-[#cad2c5]">
        <div className="flex items-center justify-center py-2">
          <svg className="animate-spin h-5 w-5 text-[#52796f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }
  
  const {
    register,
    watch,
    setValue,
    control,
    formState,
    sourceOptions,
    getSourceLabel,
    getSourceValue,
    statusOptions,
    getStatusLabel,
    getStatusValue,
    resultOptions,
    getResultLabel,
    getResultValue,
    userOptions,
    getUserNameById,
    getUserIdByName,
    customerName,
    customerPhone,
    contactOptions,
    selectedContactId,
    setSelectedContactId,
    getContactNameById,
    getContactDisplayNameById,
    setShowContactDialog,
    contactDisplayMap,
    contacts,
  } = context;

  return (
    <div className="space-y-2 pt-0">
      {/* ==================== SECTION: BASIC INFO ==================== */}
      <section className="section-basic-info bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
          </h2>
        </div>
        <div className="p-2">
          {/* Fields for address, TK, and town */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1 w-[50%]">
              <div className="w-full text-[#a8c5b5] text-sm">
                Διεύθυνση
              </div>
              <input
                type="text"
                {...register("address")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm h-8 w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
                placeholder="Εισάγετε τη διεύθυνση"
              />
            </div>
            <div className="flex flex-col gap-1 w-[30%]">
              <div className="w-full text-[#a8c5b5] text-sm">
                Πόλη
              </div>
              <input
                type="text"
                {...register("town")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm h-8 w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
                placeholder="Πόλη"
              />
            </div>
            <div className="flex flex-col gap-1 w-[18%]">
              <div className="w-full text-[#a8c5b5] text-sm">
                Τ.Κ.
              </div>
              <input
                type="text"
                {...register("postal_code")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm h-8 w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
                placeholder="Τ.Κ."
              />
            </div>
          </div>
          
          <div className="flex flex-wrap justify-between gap-2 mt-2">
            <div className="flex flex-col gap-0.5 w-[50%]">
              <div className="w-full text-[#a8c5b5] text-sm">
                Ζήτηση Πελάτη
              </div>
              <textarea
                {...register("requirements")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md text-sm w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200 py-1 px-2 resize-none [height:70px!important]"
                placeholder="Εισάγετε τη ζήτηση πελάτη"
              />
            </div>
            <div className="flex flex-col gap-0.5 w-[48%]">
              <div className="w-full text-[#a8c5b5] text-sm">
                Ποσό
              </div>
              <textarea
                {...register("amount")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border-2 border-[#52796f] text-[#cad2c5] rounded-md text-sm w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200 py-1 px-2 resize-none [height:70px!important]"
                placeholder="Εισάγετε το ποσό"
                onFocus={(e) => {
                  // Clear the field if it contains only "0"
                  if (e.target.value === "0") {
                    e.target.value = "";
                  }
                  // Set cursor at the end of text
                  const val = e.target.value;
                  e.target.value = '';
                  e.target.value = val;
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION: REQUIREMENTS ==================== */}
      <section className="section-requirements bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΕΠΙΠΛΕΟΝ ΣΤΟΙΧΕΙΑ
          </h2>
        </div>
        <div className="p-2 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2" style={{ position: 'relative', zIndex: 15, pointerEvents: 'auto' }}>
            <HMAToggle control={control} setValue={setValue} />

            <div className="flex items-center">
              <div className="w-1/5 text-[#a8c5b5] text-sm pr-0">
                Βεβαίωση
              </div>
              <div className="w-4/5">
                <Input
                  id="certificate"
                  className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8 text-sm pl-2"
                  {...register("certificate")}
                  disabled={formState.isSubmitting}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION: STATUS AND ASSIGNMENT ==================== */}
      <section className="status-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΚΑΤΑΣΤΑΣΗ & ΑΝΑΘΕΣΗ
          </h2>
        </div>
        <div className="p-2 space-y-2">
          {/* Status and Assignment dropdowns in a grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Ανάθεση σε */}
            <div className="flex items-center">
              <div className="w-24 text-[#a8c5b5] text-sm pr-2 flex justify-start">
                Ανάθεση σε
              </div>
              <div className="w-56">
                <GlobalDropdown
                  options={userOptions}
                  value={getUserNameById(watch("assigned_to") || "")}
                  onSelect={(value) => {
                    const userId = getUserIdByName(value);
                    setValue("assigned_to", userId);
                  }}
                  placeholder="Επιλέξτε χρήστη"
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8 pl-2"
                  disabled={formState.isSubmitting}
                />
              </div>
            </div>
            
            {/* Κατάσταση */}
            <div className="flex items-center">
              <div className="w-24 text-[#a8c5b5] text-sm pr-2 flex justify-start">
                Κατάσταση
              </div>
              <div className="w-56">
                <GlobalDropdown
                  options={statusOptions.map(option => option.label)}
                  value={getStatusLabel(watch("offer_result") || "")}
                  onSelect={(label) => setValue("offer_result", getStatusValue(label))}
                  placeholder="Επιλέξτε κατάσταση"
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8 pl-2"
                  disabled={formState.isSubmitting}
                />
              </div>
            </div>

            {/* Αποτέλεσμα */}
            <div className="flex items-center">
              <div className="w-24 text-[#a8c5b5] text-sm pr-2 flex justify-start">
                Αποτέλεσμα
              </div>
              <div className="w-44">
                <GlobalDropdown
                  options={resultOptions.map(option => option.label)}
                  value={getResultLabel(watch("result") || "none")}
                  onSelect={(label) => setValue("result", getResultValue(label))}
                  placeholder="Επιλέξτε αποτέλεσμα"
                  disabled={watch("offer_result") !== "ready" || formState.isSubmitting}
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8 pl-2"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION: COMMENTS ==================== */}
      <section className="section-comments bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΣΧΟΛΙΑ
          </h2>
        </div>
        <div className="p-2">
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-0.5 w-1/2">
              <div className="w-full text-[#a8c5b5] text-sm">
                Σχόλια Πελάτη
              </div>
              <textarea
                {...register("customer_comments")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md text-sm w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200 py-1 px-2 resize-none [height:70px!important]"
                placeholder="Εισάγετε σχόλια πελάτη"
              />
            </div>
            <div className="flex flex-col gap-0.5 w-1/2">
              <div className="w-full text-[#a8c5b5] text-sm">
                Δικά μας Σχόλια
              </div>
              <textarea
                {...register("our_comments")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md text-sm w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200 py-1 px-2 resize-none [height:70px!important]"
                placeholder="Εισάγετε τα σχόλιά μας"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

/**
 * HMA Toggle component
 */
const HMAToggle = ({ control, setValue }) => {
  // Use our custom useFormWatch helper
  const hmaValue = useFormWatch(control, "hma", false);

  const toggleHma = () => {
    setValue("hma", !hmaValue);
  };

  return (
    <div className="flex items-center">
      <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
        ΗΜΑ
      </div>
      <div className="w-2/3 flex items-center">
        <div className="relative flex items-center">
          <div 
            className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out ${
              hmaValue 
                ? 'bg-[#52796f] border border-[#84a98c]' 
                : 'bg-[#354f52] border border-[#52796f]'
            }`}
            onClick={toggleHma}
            style={{ cursor: 'pointer' }}
          >
            <div 
              className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
                hmaValue 
                  ? 'transform translate-x-7 bg-[#84a98c]' 
                  : 'transform translate-x-1 bg-gray-500'
              }`}
            ></div>
          </div>
          <span 
            className={`ml-2 text-sm ${hmaValue ? 'text-[#84a98c]' : 'text-[#cad2c5]'}`}
            onClick={toggleHma}
            style={{ cursor: 'pointer' }}
          >
            {hmaValue ? 'Ναι' : 'Όχι'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BasicTab; 