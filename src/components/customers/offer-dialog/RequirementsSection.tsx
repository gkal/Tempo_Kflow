import React, { useContext } from 'react';
import { Input } from "@/components/ui/input";
import { OfferDialogContext } from '../OffersDialog';

const RequirementsSection = () => {
  const { register, watch, setValue, watchHma } = useContext(OfferDialogContext);

  return (
    <div className="section-requirements bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΑΠΑΙΤΗΣΕΙΣ
        </h2>
      </div>
      <div className="p-3 space-y-3">
        <div className="flex items-start">
          <div className="w-1/6 text-[#a8c5b5] text-sm pr-1 pt-2">
            Απαιτήσεις
          </div>
          <div className="w-5/6">
            <textarea
              id="requirements"
              className="w-full bg-[#2f3e46] text-[#cad2c5] p-2 rounded-sm"
              style={{
                border: '1px solid #52796f',
                outline: 'none',
                fontSize: '0.875rem'
              }}
              placeholder="Απαιτήσεις του πελάτη προς εμάς"
              rows={3}
              {...register("requirements")}
            ></textarea>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
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
            <div className="w-1/2 text-[#a8c5b5] text-sm pr-1">
              Πιστοποιητικό
            </div>
            <div className="w-1/2">
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