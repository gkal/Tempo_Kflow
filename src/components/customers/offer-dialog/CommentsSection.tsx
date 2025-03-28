import React, { useContext, useEffect } from 'react';
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';

const CommentsSection = () => {
  const context = useContext<OfferDialogContextType | null>(OfferDialogContext);
  
  // Add default values to prevent TypeError when context is null
  const {
    register = () => ({ name: "" }),
    watch = () => "",
    setValue = () => {}
  } = context || {};

  // Force a re-render when the form values change
  useEffect(() => {
    // This is just to trigger a re-render when the component mounts
    if (typeof watch === 'function') {
      // Just call watch to subscribe to form changes
      const values = watch();
    }
  }, [watch]);

  // If context is null, show a loading state or return null
  if (!context) {
    return (
      <div className="section-comments bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
        <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
          <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
            ΣΧΟΛΙΑ
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
    <div className="section-comments bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΣΧΟΛΙΑ
        </h2>
      </div>
      <div className="p-2">
        <div className="flex flex-row gap-2">
          <div className="flex flex-col gap-0.5 w-1/2">
            <div className="w-full text-[#a8c5b5] text-sm">
              Σχόλια Πελάτη
            </div>
            <textarea
              {...register("customer_comments")}
              className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm resize-none w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              rows={5}
              placeholder="Εισάγετε σχόλια πελάτη"
            />
          </div>
          <div className="flex flex-col gap-0.5 w-1/2">
            <div className="w-full text-[#a8c5b5] text-sm">
              Δικά μας Σχόλια
            </div>
            <textarea
              {...register("our_comments")}
              className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-sm resize-none w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              rows={5}
              placeholder="Εισάγετε δικά μας σχόλια"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsSection; 