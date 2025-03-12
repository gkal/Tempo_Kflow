import React, { useContext } from 'react';
import { Input } from "@/components/ui/input";
import { OfferDialogContext } from '../OffersDialog';

const RequirementsSection = () => {
  const { register, watch, setValue, watchHma } = useContext(OfferDialogContext);

  return (
    <div className="section-requirements bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΕΠΙΠΛΕΟΝ ΣΤΟΙΧΕΙΑ
        </h2>
      </div>
      <div className="p-2 space-y-2">
        <div className="flex flex-col gap-2">
          {/* Remove the following lines
          <label className="text-sm font-medium">Ζήτηση Πελάτη:</label>
          <textarea
            {...register("requirements")}
            className="border rounded-md p-1 text-sm resize-none w-full"
            rows={2}
            placeholder="Εισάγετε τη ζήτηση πελάτη"
          />
          */}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              ΗΜΑ
            </div>
            <div className="w-2/3 flex items-center">
              <div className="relative flex items-center">
                <div className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out bg-[#354f52] border border-[#52796f]`}>
                  <div 
                    className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
                      watchHma 
                        ? 'transform translate-x-7 bg-[#52796f]' 
                        : 'transform translate-x-1 bg-gray-500'
                    }`}
                  ></div>
                </div>
                <button
                  type="button"
                  onClick={() => setValue("hma", !watchHma)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                ></button>
                <span className="ml-2 text-sm">
                  {watchHma ? 'Ναι' : 'Όχι'}
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
                className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
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