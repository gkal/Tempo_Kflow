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
    <div className="section-basic-info bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ
        </h2>
      </div>
      <div className="p-3">
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-1/6 text-[#a8c5b5] text-sm pr-0">
              Πηγή Αιτήματος
            </div>
            <div className="w-5/6" style={inputContainerStyle}>
              <div className="w-1/4">
                <GlobalDropdown
                  options={sourceOptions.map(option => option.label)}
                  value={getSourceLabel(watch("source"))}
                  onSelect={(label) => setValue("source", getSourceValue(label))}
                  placeholder="Επιλέξτε πηγή"
                />
              </div>
            </div>
          </div>

          <div className="flex items-start">
            <div className="w-1/6 text-[#a8c5b5] text-sm pr-0 pt-2">
              Ζήτηση
            </div>
            <div className="w-5/6" style={inputContainerStyle}>
              <textarea
                id="amount"
                className="w-full bg-[#2f3e46] text-[#cad2c5] p-2 rounded-sm"
                style={{
                  border: '1px solid #52796f',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                placeholder="Ζήτηση πελάτη"
                rows={5}
                {...register("amount")}
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection; 