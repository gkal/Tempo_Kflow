import React, { useContext } from 'react';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';
import { useFormWatch } from "@/lib/form-helpers";

const SourceSection = () => {
  const context = useContext<OfferDialogContextType | null>(OfferDialogContext);
  
  if (!context) return null;
  
  const { 
    control,
    setValue,
    sourceOptions,
    getSourceLabel,
    getSourceValue
  } = context;
  
  // Use our custom useFormWatch helper
  const sourceValue = useFormWatch(control, "source", "");

  return (
    <div className="source-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
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
            options={sourceOptions.map(option => option.label)}
            value={sourceValue ? getSourceLabel(sourceValue) : ""}
            onSelect={(value) => {
              const sourceValue = getSourceValue(value);
              setValue("source", sourceValue);
            }}
            placeholder="Επιλέξτε πηγή"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default SourceSection; 