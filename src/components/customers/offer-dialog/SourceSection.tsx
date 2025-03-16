import React, { useContext, useEffect } from 'react';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';

const SourceSection = () => {
  const context = useContext<OfferDialogContextType | null>(OfferDialogContext);
  
  // Add default values to prevent TypeError when context is null
  const {
    register = () => ({ name: "" }),
    watch = () => "",
    setValue = () => {},
    sourceOptions = [],
    getSourceLabel = (val) => val,
    getSourceValue = (val) => val
  } = context || {};

  // Force a re-render when the form values change
  useEffect(() => {
    // This is just to trigger a re-render when the component mounts
    const sourceValue = watch("source");
    
    // Log the values to help with debugging
    if (sourceValue) {
      console.log("SourceSection source value:", sourceValue);
    }
  }, [watch]);

  // If context is null, show a loading state or return null
  if (!context) {
    return (
      <div className="section-source bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΠΗΓΗ
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

  // Convert source options to string array for GlobalDropdown
  const stringOptions = sourceOptions.map(option => getSourceLabel(option));
  
  // Handle selection by finding the original option and setting its value
  const handleSelect = (selectedLabel: string) => {
    const selectedOption = sourceOptions.find(option => 
      getSourceLabel(option) === selectedLabel
    );
    if (selectedOption) {
      setValue("source", getSourceValue(selectedOption));
    }
  };

  return (
    <div className="section-source bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΠΗΓΗ
        </h2>
      </div>
      <div className="p-2">
        <div className="flex flex-col gap-1">
          <div className="w-full text-[#a8c5b5] text-sm">
            Πηγή
          </div>
          <GlobalDropdown
            options={stringOptions}
            onSelect={handleSelect}
            value={watch("source") ? getSourceLabel(watch("source")) : ""}
            placeholder="Επιλέξτε πηγή"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default SourceSection; 