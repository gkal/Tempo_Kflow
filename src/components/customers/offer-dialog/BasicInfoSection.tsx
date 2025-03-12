import React, { useContext, CSSProperties } from 'react';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { OfferDialogContext } from '../OffersDialog';

const BasicInfoSection = () => {
  const {
    register,
    watch,
    setValue,
    sourceOptions,
    getSourceLabel,
    getSourceValue
  } = useContext(OfferDialogContext);

  // Common style for left alignment
  const inputContainerStyle: CSSProperties = {
    marginLeft: '0',
    textAlign: 'left' as const
  };

  return (
    <div className="-mt-3 section-basic-info bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden w-full max-w-full">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
        </h2>
      </div>
      <div className="p-2">
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex flex-col gap-2 w-full md:w-[48%]">
            <div className="w-full text-[#a8c5b5] text-sm">
              Ζήτηση Πελάτη
            </div>
            <textarea
              {...register("requirements")}
              className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-xs resize-none w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              rows={2}
              placeholder="Εισάγετε τη ζήτηση πελάτη"
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-[48%]">
            <div className="w-full text-[#a8c5b5] text-sm">
              Ποσό
            </div>
            <textarea
              {...register("amount")}
              className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] rounded-md p-1 text-xs resize-none w-full hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              rows={2}
              placeholder="Εισάγετε το ποσό"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection; 