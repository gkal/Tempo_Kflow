import React, { useContext } from 'react';
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { OfferDialogContext } from '../OffersDialog';

const StatusSection = () => {
  const {
    watch,
    setValue,
    statusOptions,
    resultOptions,
    userOptions,
    getStatusLabel,
    getStatusValue,
    getResultLabel,
    getResultValue,
    getUserNameById,
    getUserIdByName,
    watchOfferResult
  } = useContext(OfferDialogContext);

  return (
    <div className="status-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΚΑΤΑΣΤΑΣΗ & ΑΝΑΘΕΣΗ
        </h2>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              Κατάσταση
            </div>
            <div className="w-2/3">
              <GlobalDropdown
                options={statusOptions.map(option => option.label)}
                value={getStatusLabel(watch("offer_result"))}
                onSelect={(label) => setValue("offer_result", getStatusValue(label))}
                placeholder="Επιλέξτε κατάσταση"
                className="dropdown-header"
              />
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              Ανάθεση σε
            </div>
            <div className="w-2/3">
              <GlobalDropdown
                options={userOptions}
                value={getUserNameById(watch("assigned_to") || "")}
                onSelect={(value) => setValue("assigned_to", getUserIdByName(value))}
                placeholder="Επιλέξτε χρήστη"
                className="dropdown-header"
              />
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-1/3 text-[#a8c5b5] text-sm pr-1">
              Αποτέλεσμα
            </div>
            <div className="w-2/3">
              <GlobalDropdown
                options={resultOptions.map(option => option.label)}
                value={getResultLabel(watch("result") || "none")}
                onSelect={(label) => setValue("result", getResultValue(label))}
                placeholder="Επιλέξτε αποτέλεσμα"
                disabled={watchOfferResult !== "ready"}
                className="dropdown-header"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusSection; 