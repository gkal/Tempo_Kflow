import React, { useContext } from 'react';
import { Input } from "@/components/ui/input";
import { OfferDialogContext } from '../OffersDialog';

const RequirementsSection = () => {
  const context = useContext(OfferDialogContext);
  
  // Add default values to prevent TypeError when context is null
  const {
    register = () => ({ name: "" }),
    watch = () => "",
    setValue = () => {}
  } = context || {};

  // Default to false if context is null or watch function fails
  const hmaValue = context ? Boolean(watch("hma")) : false;

  // If context is null, show a loading state or return null
  if (!context) {
    return (
      <div className="section-requirements bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΑΠΑΙΤΗΣΕΙΣ
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
    <div className="section-requirements bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΕΠΙΠΛΕΟΝ ΣΤΟΙΧΕΙΑ
        </h2>
      </div>
      <div className="p-2 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  onClick={() => setValue("hma", !hmaValue)}
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
                  onClick={() => setValue("hma", !hmaValue)}
                  style={{ cursor: 'pointer' }}
                >
                  {hmaValue ? 'Ναι' : 'Όχι'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-1/5 text-[#a8c5b5] text-sm pr-0">
              Βεβαίωση
            </div>
            <div className="w-4/5">
              <Input
                id="certificate"
                className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8 text-sm"
                {...register("certificate")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequirementsSection; 