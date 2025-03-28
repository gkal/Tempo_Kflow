import React, { useContext } from 'react';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';
import { useFormWatch } from "@/utils/formHelpers";

const ResultSection = () => {
  const context = useContext<OfferDialogContextType | null>(OfferDialogContext);
  
  if (!context) return null;
  
  const { 
    control,
    setValue,
    resultOptions,
    getResultLabel,
    getResultValue
  } = context;
  
  // Use our custom useFormWatch helper
  const resultValue = useFormWatch(control, "result", "");
  const isStatusReady = useFormWatch(control, "status", "") === "ready";

  return (
    <div className="result-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΑΠΟΤΕΛΕΣΜΑ
        </h2>
      </div>
      <div className="p-2">
        <div className="flex flex-col gap-1">
          <div className="w-full text-[#a8c5b5] text-sm">
            Αποτέλεσμα
          </div>
          <GlobalDropdown
            options={resultOptions.map(option => option.label)}
            value={resultValue ? getResultLabel(resultValue) : ""}
            onSelect={(value) => {
              const resultValue = getResultValue(value);
              setValue("result", resultValue);
            }}
            placeholder="Επιλέξτε αποτέλεσμα"
            className={`w-full ${!isStatusReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isStatusReady}
          />
          {!isStatusReady && (
            <div className="text-xs text-[#e09f3e] mt-1">
              Το αποτέλεσμα μπορεί να οριστεί μόνο όταν η κατάσταση είναι "Ολοκληρώθηκε"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultSection; 