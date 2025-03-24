import React, { useContext } from 'react';
import { Input } from "@/components/ui/input";
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';
import { useFormWatch } from "@/utils/formHelpers";

const RequirementsSection = () => {
  const context = useContext<OfferDialogContextType | null>(OfferDialogContext);
  
  if (!context) return null;
  
  const { register, control, setValue } = context;
  
  // Use our custom useFormWatch helper
  const hmaValue = useFormWatch(control, "hma", false);

  const toggleHma = () => {
    setValue("hma", !hmaValue);
  };

  return (
    <div className="section-requirements bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΕΠΙΠΛΕΟΝ ΣΤΟΙΧΕΙΑ
        </h2>
      </div>
      <div className="p-2 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2" style={{ position: 'relative', zIndex: 15, pointerEvents: 'auto' }}>
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
                  style={{ cursor: 'pointer', position: 'relative', zIndex: 20, pointerEvents: 'auto' }}
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
                  style={{ cursor: 'pointer', position: 'relative', zIndex: 20, pointerEvents: 'auto' }}
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