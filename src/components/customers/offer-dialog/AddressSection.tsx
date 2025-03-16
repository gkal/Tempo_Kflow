import React, { useContext } from 'react';
import { Input } from "@/components/ui/input";
import { OfferDialogContext } from '../OffersDialog';

const AddressSection = () => {
  const { register } = useContext(OfferDialogContext);

  return (
    <div className="address-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΔΙΕΥΘΥΝΣΗ ΠΑΡΑΛΑΒΗΣ
        </h2>
      </div>
      <div className="p-2">
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              Διεύθυνση
            </div>
            <div className="w-2/3">
              <Input
                id="address"
                className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
                {...register("address")}
              />
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              Τ.Κ.
            </div>
            <div className="w-2/3">
              <Input
                id="tk"
                className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
                {...register("postal_code")}
              />
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              Πόλη
            </div>
            <div className="w-2/3">
              <Input
                id="town"
                className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
                {...register("town")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressSection; 