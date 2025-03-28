import React, { useContext } from 'react';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';
import { useFormWatch } from "@/utils/formHelpers";

const AssignmentSection = () => {
  const context = useContext<OfferDialogContextType | null>(OfferDialogContext);
  
  if (!context) {
    return (
      <div className="section-assignment bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΑΝΑΘΕΣΗ
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
  
  const { control, setValue, userOptions, getUserNameById, getUserIdByName } = context;
  
  // Use our custom useFormWatch helper
  const assignedTo = useFormWatch(control, "assigned_to", "");

  return (
    <div className="section-assignment bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΑΝΑΘΕΣΗ
        </h2>
      </div>
      <div className="p-2">
        <div className="flex flex-col gap-1">
          <div className="w-full text-[#a8c5b5] text-sm">
            Ανάθεση σε
          </div>
          <GlobalDropdown
            options={userOptions}
            value={getUserNameById(assignedTo || "")}
            onSelect={(value) => {
              const userId = getUserIdByName(value);
              setValue("assigned_to", userId);
            }}
            placeholder="Επιλέξτε χρήστη"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default AssignmentSection; 