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

  // Styles for consistent alignment
  const assignedToStyle = {
    width: 'calc(42% - 12px)',
    marginLeft: '0'
  };
  
  const statusStyle = {
    width: 'calc(100% - 12px)',
    marginLeft: '0'
  };

  return (
    <div className="status-section bg-[#3a5258] rounded-md border border-[#52796f] shadow-md overflow-hidden">
      <div className="bg-[#3a5258] px-4 py-2 border-b border-[#52796f]">
        <h2 className="text-sm font-semibold text-[#a8c5b5] uppercase tracking-wider">
          ΚΑΤΑΣΤΑΣΗ & ΑΝΑΘΕΣΗ
        </h2>
      </div>
      <div className="p-2 space-y-2">
        {/* First line - Ανάθεση σε */}
        <div className="flex items-center">
          <div className="w-24 text-[#a8c5b5] text-sm pr-1 flex justify-start">
            Ανάθεση σε
          </div>
          <div className="flex-1">
            <div style={assignedToStyle}>
              <GlobalDropdown
                options={userOptions}
                value={getUserNameById(watch("assigned_to") || "")}
                onSelect={(value) => {
                  const userId = getUserIdByName(value);
                  console.log(`Setting assigned_to to: ${userId} (from name: ${value})`);
                  setValue("assigned_to", userId);
                }}
                placeholder="Επιλέξτε χρήστη"
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Second line - Κατάσταση and Αποτέλεσμα */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center">
            <div className="w-24 text-[#a8c5b5] text-sm pr-1 flex justify-start">
              Κατάσταση
            </div>
            <div className="flex-1">
              <div style={statusStyle}>
                <GlobalDropdown
                  options={statusOptions.map(option => option.label)}
                  value={getStatusLabel(watch("offer_result"))}
                  onSelect={(label) => setValue("offer_result", getStatusValue(label))}
                  placeholder="Επιλέξτε κατάσταση"
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-20 text-[#a8c5b5] text-sm pr-0 flex justify-start">
              Αποτέλεσμα
            </div>
            <div className="flex-1">
              <GlobalDropdown
                options={resultOptions.map(option => option.label)}
                value={getResultLabel(watch("result") || "none")}
                onSelect={(label) => setValue("result", getResultValue(label))}
                placeholder="Επιλέξτε αποτέλεσμα"
                disabled={watchOfferResult !== "ready"}
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusSection; 