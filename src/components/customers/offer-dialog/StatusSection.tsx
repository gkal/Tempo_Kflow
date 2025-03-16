import React, { useContext, useEffect } from 'react';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';

// Define a type for the form values
interface FormValues {
  assigned_to?: string;
  offer_result?: string;
  result?: string;
  [key: string]: any;
}

const StatusSection = () => {
  const context = useContext<OfferDialogContextType | null>(OfferDialogContext);
  
  // Add default values to prevent TypeError when context is null
  const {
    register = () => ({ name: "" }),
    watch = () => "",
    setValue = () => {},
    statusOptions = [],
    resultOptions = [],
    userOptions = [],
    getStatusLabel = (val) => val,
    getStatusValue = (val) => val,
    getResultLabel = (val) => val,
    getResultValue = (val) => val,
    getUserNameById = (id) => id,
    getUserIdByName = (name) => name
  } = context || {};

  // Force a re-render when the form values change
  useEffect(() => {
    // This is just to trigger a re-render when the component mounts
    if (typeof watch === 'function') {
      const values = watch();
    }
  }, [watch]);

  // If context is null, show a loading state or return null
  if (!context) {
    return (
      <div className="status-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΚΑΤΑΣΤΑΣΗ & ΑΝΑΘΕΣΗ
          </h2>
        </div>
        <div className="p-4 text-center text-[#cad2c5]">
          <div className="flex items-center justify-center py-2">
            <svg className="animate-spin h-5 w-5 text-[#52796f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Styles for consistent alignment
  const assignedToStyle = {
    width: 'calc(42% - 12px)',
    marginLeft: '0'
  };
  
  const statusStyle = {
    width: 'calc(100% - 12px)',
    marginLeft: '0'
  };

  // Get the current values from the form
  let formValues: FormValues = {};
  if (typeof watch === 'function') {
    try {
      formValues = watch() as FormValues;
    } catch (error) {
      console.error("Error watching form values:", error);
    }
  }
  
  const assignedTo = formValues.assigned_to || "";
  const offerResult = formValues.offer_result || "";
  const result = formValues.result || "none";
  
  // Check if the offer result is "ready" to enable the result dropdown
  const isOfferResultReady = offerResult === "ready";

  return (
    <div className="status-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΚΑΤΑΣΤΑΣΗ & ΑΝΑΘΕΣΗ
        </h2>
      </div>
      <div className="p-2 space-y-2">
        {/* First line - Ανάθεση σε */}
        <div className="flex items-center">
          <div className="w-24 text-[#a8c5b5] text-sm pr-1 flex justify-start">
            Ανάθεση σε
          </div>
          <div className="flex-1">
            <div style={assignedToStyle}>
              <GlobalDropdown
                options={userOptions}
                value={getUserNameById(assignedTo)}
                onSelect={(value) => {
                  const userId = getUserIdByName(value);
                  setValue("assigned_to", userId);
                }}
                placeholder="Επιλέξτε χρήστη"
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
              />
            </div>
          </div>
        </div>

        {/* Second line - Κατάσταση and Αποτέλεσμα */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center">
            <div className="w-24 text-[#a8c5b5] text-sm pr-1 flex justify-start">
              Κατάσταση
            </div>
            <div className="flex-1">
              <div style={statusStyle}>
                <GlobalDropdown
                  options={statusOptions.map(option => option.label)}
                  value={getStatusLabel(offerResult)}
                  onSelect={(label) => setValue("offer_result", getStatusValue(label))}
                  placeholder="Επιλέξτε κατάσταση"
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-20 text-[#a8c5b5] text-sm pr-0 flex justify-start">
              Αποτέλεσμα
            </div>
            <div className="flex-1">
              <GlobalDropdown
                options={resultOptions.map(option => option.label)}
                value={getResultLabel(result)}
                onSelect={(label) => setValue("result", getResultValue(label))}
                placeholder="Επιλέξτε αποτέλεσμα"
                disabled={!isOfferResultReady}
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusSection; 