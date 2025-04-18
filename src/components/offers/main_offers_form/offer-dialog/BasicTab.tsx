import React, { useContext, CSSProperties, useEffect, useState, useRef } from 'react';
import { OfferDialogContext } from './OfferDialogContext';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle, DialogDescription, Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Plus, Phone, Calendar, ChevronDown, Search, Check, ArrowRight, Settings } from "lucide-react";
import { DayPicker } from 'react-day-picker';
import { el } from 'date-fns/locale';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { createPortal } from 'react-dom';
import { TruncateWithTooltip } from "@/components/ui/GlobalTooltip";
import { EquipmentCategory, EquipmentItem } from "@/services/api/types";
import { fetchRecords } from "@/services/api/supabaseService";
import { Button } from "@/components/ui/button";
import { DataTableBase } from "@/components/ui/data-table-base";
import { Card, CardContent } from "@/components/ui/card";

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
  
  // Replace dropdown state with dialog state
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  
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

  // Helper to append equipment item text to the input
  const handleEquipmentSelect = (item: EquipmentItem) => {
    // Display the equipment name in the input field
    const currentValue = watch("our_transport") || "";
    const newValue = currentValue ? `${currentValue}, ${item.item_name}` : item.item_name;
    
    // Store the actual text in both fields
    setValue("our_transport", newValue);
    setValue("transport_type", newValue);
  };

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
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center w-[42%]">
              <div className="text-[#a8c5b5] text-sm whitespace-nowrap mr-2 min-w-16">
                Διεύθυνση
              </div>
              <input
                type="text"
                {...register("address")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm h-8 w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
                placeholder="Διεύθυνση"
              />
            </div>
            <div className="flex items-center w-[33%]">
              <div className="text-[#a8c5b5] text-sm whitespace-nowrap mr-2 min-w-10">
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
            <div className="flex items-center w-[20%]">
              <div className="text-[#a8c5b5] text-sm whitespace-nowrap mr-2 min-w-10">
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
            <div className="flex flex-col gap-0.5 w-[33%]">
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
            <div className="flex flex-col gap-0.5 w-[33%]">
              <div className="w-full text-[#a8c5b5] text-sm">
                Είδος Αποβλήτου / Κατηγορία
              </div>
              <textarea
                {...register("waste_type")}
                disabled={formState.isSubmitting}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md text-sm w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200 py-1 px-2 resize-none [height:70px!important]"
                placeholder="Εισάγετε το είδος αποβλήτου"
              />
            </div>
            <div className="flex flex-col gap-0.5 w-[30%]">
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
      <div className="flex gap-2 items-stretch">
        <section className="section-requirements bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-1/2" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
          <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f]">
            <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
              ΕΠΙΠΛΕΟΝ ΣΤΟΙΧΕΙΑ
            </h2>
          </div>
          <div className="py-1 px-3">
            <div className="flex flex-col gap-1" style={{ position: 'relative', zIndex: 15, pointerEvents: 'auto' }}>
              <div className="flex items-center py-1">
                <div className="w-[100px] text-[#a8c5b5] text-sm whitespace-nowrap">
                  ΗΜΑ
                </div>
                <div className="flex items-center">
                  <div className="relative flex items-center">
                    <div 
                      className="relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out flex items-center"
                      onClick={() => setValue("hma", !watch("hma"))}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: watch("hma") ? '#52796f' : '#354f52',
                        borderWidth: '1px',
                        borderColor: watch("hma") ? '#84a98c' : '#52796f'
                      }}
                    >
                      <div 
                        className="absolute w-4 h-4 rounded-full transition-all duration-200 ease-in-out"
                        style={{ 
                          top: 'calc(50% - 0.5rem)',
                          left: watch("hma") ? 'calc(100% - 1.1rem)' : '2px',
                          backgroundColor: watch("hma") ? '#84a98c' : '#a0a0a0'
                        }}
                      ></div>
                    </div>
                    <span 
                      className={`ml-2 text-sm ${watch("hma") ? 'text-[#84d970] font-semibold' : 'text-[#cad2c5]'}`}
                      onClick={() => setValue("hma", !watch("hma"))}
                      style={{ cursor: 'pointer' }}
                    >
                      {watch("hma") ? 'Ναι' : 'Όχι'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center py-1">
                <div className="w-[100px] text-[#a8c5b5] text-sm whitespace-nowrap">
                  Βεβαίωση
                </div>
                <div className="flex-1">
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
        
        {/* ==================== SECTION: METAFORES ==================== */}
        <section className="section-metafores bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-1/2" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
          <div className="bg-[#3a5258] px-4 py-1 border-b border-[#52796f] flex justify-between items-center">
            <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
              ΜΕΤΑΦΟΡΑ
            </h2>
            <div className="flex items-center">
              <div className="w-12 text-center">
                <span className={`text-xs inline-block whitespace-nowrap font-semibold ${!watch("who_transport") ? 'text-[#84d970]' : 'text-[#9bafa6]'}`}>
                  Πελάτης
                </span>
              </div>
              <div className="relative mx-2 w-10 h-5 rounded-full transition-colors duration-200 ease-in-out"
                onClick={() => setValue("who_transport", !watch("who_transport"))}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: watch("who_transport") ? '#52796f' : '#354f52',
                  borderWidth: '1px',
                  borderColor: watch("who_transport") ? '#84a98c' : '#52796f'
                }}
              >
                <div
                  className="absolute w-3.5 h-3.5 rounded-full transition-all duration-200 ease-in-out"
                  style={{ 
                    top: 'calc(50% - 0.4375rem)',
                    left: watch("who_transport") ? 'calc(100% - 0.875rem - 2px)' : '2px',
                    backgroundColor: watch("who_transport") ? '#84a98c' : '#a0a0a0'
                  }}
                ></div>
              </div>
              <div className="w-12 text-center">
                <span className={`text-xs inline-block whitespace-nowrap font-semibold ${watch("who_transport") ? 'text-[#84d970]' : 'text-[#9bafa6]'}`}>
                  Κρόνος
                </span>
              </div>
            </div>
          </div>
          <div className="py-1 px-3">
            <div className="flex flex-col gap-1" style={{ position: 'relative', zIndex: 15, pointerEvents: 'auto' }}>
              <div className="flex items-center py-1">
                <div className="w-[100px] text-[#a8c5b5] text-sm whitespace-nowrap">
                  Μέσο Δικό μας
                </div>
                <div className="flex-1 relative">
                  <div className="flex">
                    <Input
                      id="our_transport"
                      className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8 text-sm pl-2 pr-8"
                      placeholder="Μέσο μεταφοράς μας"
                      disabled={formState.isSubmitting}
                      {...register("our_transport")}
                      onChange={(e) => {
                        // Also update transport_type with the same value
                        const value = e.target.value;
                        setValue("transport_type", value);
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#84a98c] hover:text-[#cad2c5] bg-transparent border-none"
                      onClick={() => setShowEquipmentDialog(true)}
                    >
                      <Settings size={16} />
                    </button>
                  </div>
                  
                  {/* Equipment Selector Dialog */}
                  <EquipmentSelector
                    open={showEquipmentDialog}
                    onClose={() => setShowEquipmentDialog(false)}
                    onSelect={handleEquipmentSelect}
                  />
                </div>
              </div>
              
              <div className="flex items-center py-1">
                <div className="w-[100px] text-[#a8c5b5] text-sm whitespace-nowrap">
                  Τρ.Φόρτωσης
                </div>
                <div className="flex-1">
                  <Input
                    id="loading"
                    className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8 text-sm pl-2"
                    placeholder="Τρόπος φόρτωσης"
                    disabled={formState.isSubmitting}
                    {...register("loading")}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

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

// Create a new EquipmentSelector component
interface EquipmentSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: EquipmentItem) => void;
}

const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({ 
  open, 
  onClose, 
  onSelect
}) => {
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<any[]>([]);
  // Get current transport_type value from context to highlight selection
  const context = useContext(OfferDialogContext) as ExtendedContextType | null;
  const currentTransportType = context ? context.watch("transport_type") : null;
  
  // Fetch equipment categories and items
  useEffect(() => {
    if (open) {
      const fetchEquipment = async () => {
        try {
          setLoading(true);
          
          // Fetch categories
          const categoriesData = await fetchRecords<EquipmentCategory>(
            "equipment_categories",
            { order: { column: "category_name", ascending: true } }
          );
          
          // Fetch items
          const itemsData = await fetchRecords<EquipmentItem>(
            "equipment_items",
            { order: { column: "item_name", ascending: true } }
          );
          
          const fetchedCategories = categoriesData?.data as EquipmentCategory[] || [];
          const fetchedItems = itemsData?.data as EquipmentItem[] || [];
          
          setCategories(fetchedCategories);
          setItems(fetchedItems);
          
          // Create table data with the same structure as EquipmentSettingsTab
          const combinedData = [];
          let sortOrder = 0;
          
          // Process each category and its items
          if (fetchedCategories) {
            fetchedCategories.forEach(category => {
              // Find available items for this category before adding the category
              const relatedItems = fetchedItems.filter(
                item => item.category_id === category.id && item.is_available === true
              ) || [];
              
              // Only add the category if it has at least one available item
              if (relatedItems.length > 0) {
                // Add the main category
                combinedData.push({
                  id: category.id,
                  category_name: category.category_name,
                  created_at: category.created_at || category.date_created,
                  date_created: category.date_created,
                  date_updated: category.date_updated,
                  user_create: category.user_create,
                  user_updated: category.user_updated,
                  isItem: false,
                  code_prefix: category.code_prefix || null,
                  sortIndex: sortOrder++
                });
              
                // Add all available items under this category
                relatedItems.forEach(item => {
                  // Create a properly typed item entry
                  const itemEntry = {
                    id: item.id,
                    category_name: item.item_name,
                    date_created: item.date_created,
                    date_updated: item.date_updated,
                    user_create: item.user_create,
                    user_updated: item.user_updated,
                    created_at: item.created_at,
                    isItem: true,
                    parentId: item.category_id,
                    item_name: item.item_name,
                    sortIndex: sortOrder++,
                    originalItem: item
                  };
                  
                  combinedData.push(itemEntry);
                });
              }
            });
          }
          
          setTableData(combinedData);
        } catch (error) {
          console.error("Error fetching equipment data:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchEquipment();
    }
  }, [open]);

  // Handle row click
  const handleRowClick = (row: any) => {
    if (row.isItem) {
      const originalItem = row.originalItem;
      onSelect(originalItem);
      onClose();
    }
  };

  // Column definitions for the table
  const columns = [
    {
      header: "Ονομασία Εξοπλισμού",
      accessor: "category_name",
      width: "100%", 
      cell: (value: string, row: any) => {
        if (!value) return "-";
        
        if (row.isItem) {
          return (
            <div className="pl-4 flex items-center text-[#84a98c] py-0">
              <span className="mr-1 text-[#52796f] flex-shrink-0">└─</span>
              {value}
            </div>
          );
        }
        
        return (
          <div className="text-[#cad2c5] font-medium py-0">
            {value}
          </div>
        );
      }
    }
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="bg-[#2f3e46] text-[#cad2c5] border border-[#52796f] max-w-md p-4"
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-medium text-[#a8c5b5]">
            <span>Επιλογή Εξοπλισμού</span>
          </DialogTitle>
          <DialogDescription className="text-[#84a98c] text-xs">
            Επιλέξτε τον εξοπλισμό από την παρακάτω λίστα
            <span className="block mt-1 text-green-400 font-medium">Εμφανίζεται μόνο ο διαθέσιμος εξοπλισμός</span>
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-2 text-center">
            <div className="animate-pulse text-[#84a98c]">Φόρτωση εξοπλισμού...</div>
          </div>
        ) : (
          <div className="py-2">
            <DataTableBase
              columns={columns}
              data={tableData}
              isLoading={loading}
              onRowClick={handleRowClick}
              defaultSortColumn="sortIndex"
              defaultSortDirection="asc"
              emptyStateMessage="Δεν υπάρχει διαθέσιμος εξοπλισμός αυτή τη στιγμή"
              containerClassName="bg-[#354f52] rounded border border-[#52796f]"
              rowClassName="cursor-pointer hover:bg-[#354f52] py-0.5 text-xs"
              showSearch={false}
            />
          </div>
        )}
        
        <DialogFooter className="border-t border-[#52796f] pt-2 mt-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-[#354f52] border-[#52796f] text-[#cad2c5] hover:bg-[#52796f] h-8 px-3 text-sm"
          >
            Κλείσιμο
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BasicTab; 
