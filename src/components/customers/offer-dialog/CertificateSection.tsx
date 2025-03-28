import React, { useContext } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OfferDialogContext, OfferDialogContextType } from '../OffersDialog';
import { useFormWatch } from "@/utils/formHelpers";

const CertificateSection = () => {
  const context = useContext<OfferDialogContextType | null>(OfferDialogContext);
  
  if (!context) return null;
  
  const { register, control, setValue } = context;
  
  // Use our custom useFormWatch helper
  const certificate = useFormWatch(control, "certificate", "");
  const hma = useFormWatch(control, "hma", false);

  return (
    <div className="certificate-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΠΙΣΤΟΠΟΙΗΤΙΚΑ
        </h2>
      </div>
      <div className="p-2">
        <div className="space-y-2" style={{ position: 'relative', zIndex: 15, pointerEvents: 'auto' }}>
          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              Πιστοποιητικό
            </div>
            <div className="w-2/3">
              <Input
                id="certificate"
                className="bg-[#354f52] border-[#52796f] text-[#cad2c5] h-8"
                {...register("certificate")}
                style={{ position: 'relative', zIndex: 20, pointerEvents: 'auto' }}
              />
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              ΗΜΑ
            </div>
            <div className="w-2/3 flex items-center" style={{ position: 'relative', zIndex: 20, pointerEvents: 'auto' }}>
              <Checkbox
                id="hma"
                checked={Boolean(hma)}
                onCheckedChange={(checked) => {
                  setValue("hma", Boolean(checked));
                }}
                className="bg-[#354f52] border-[#52796f] text-[#cad2c5]"
                style={{ position: 'relative', zIndex: 25, pointerEvents: 'auto' }}
              />
              <Label
                htmlFor="hma"
                className="ml-2 text-[#cad2c5] text-sm cursor-pointer"
                style={{ position: 'relative', zIndex: 25, pointerEvents: 'auto' }}
              >
                Απαιτείται ΗΜΑ
              </Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateSection; 