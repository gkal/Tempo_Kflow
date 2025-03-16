import React, { useContext, CSSProperties, useEffect } from 'react';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';

const BasicInfoSection = () => {
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
    if (typeof watch === 'function') {
      const values = watch();
    }
  }, [watch]);

  // Common style for left alignment
  const inputContainerStyle: CSSProperties = {
    marginLeft: '0',
    textAlign: 'left' as const
  };

  // If context is null, show a loading state or return null
  if (!context) {
    return (
      <div className="-mt-3 section-basic-info bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
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

  return (
    <div className="-mt-3 section-basic-info bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
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
              className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm h-8 w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              placeholder="Τ.Κ."
            />
          </div>
        </div>
        
        <div className="flex flex-wrap justify-between gap-2 mt-2">
          <div className="flex flex-col gap-0.5 w-full md:w-[48%]">
            <div className="w-full text-[#a8c5b5] text-sm">
              Ζήτηση Πελάτη
            </div>
            <textarea
              {...register("requirements")}
              className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm resize-none w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              rows={3}
              placeholder="Εισάγετε τη ζήτηση πελάτη"
            />
          </div>
          <div className="flex flex-col gap-0.5 w-full md:w-[48%]">
            <div className="w-full text-[#a8c5b5] text-sm">
              Ποσό
            </div>
            <textarea
              {...register("amount")}
              className="bg-[#2f3e46] border-2 border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm resize-none w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              rows={3}
              placeholder="Εισάγετε το ποσό"
              defaultValue=""
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
    </div>
  );
};

export default BasicInfoSection; 