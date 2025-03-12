import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { Plus } from "lucide-react";

const DialogHeaderSection = ({ 
  customerName,
  isEditing,
  watch,
  setValue,
  contactOptions,
  selectedContactId,
  setSelectedContactId,
  getContactNameById,
  getContactDisplayNameById,
  setShowContactDialog,
  contactDisplayMap,
  contacts,
  sourceOptions,
  getSourceLabel,
  getSourceValue
}) => {
  return (
    <DialogHeader className="p-3 max-w-full overflow-hidden">
      <div className="flex flex-wrap justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="text-[#a8c5b5] text-sm font-medium mr-1 truncate max-w-[200px]">
            {customerName}
          </div>
          <DialogTitle className="text-[#cad2c5] text-xs cursor-default">
            {isEditing ? "Επεξεργασία Προσφοράς" : "Νέα Προσφορά"}
          </DialogTitle>
        </div>
        <div>
          {/* Empty div to maintain layout */}
        </div>
      </div>
      
      {/* Date and Contact Section */}
      <div className="bg-[#354f52] rounded-md p-2 mt-0.5 w-full max-w-full border border-[#52796f] overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Source Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-xs w-16 flex-shrink-0">
              Πηγή:
            </div>
            <div className="flex-1 min-w-0">
              <GlobalDropdown
                options={sourceOptions.map(option => option.label)}
                value={getSourceLabel(watch("source"))}
                onSelect={(label) => setValue("source", getSourceValue(label))}
                placeholder="Επιλέξτε πηγή"
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Date Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-xs w-16 flex-shrink-0">
              Ημερομηνία:
            </div>
            <div className="flex-1 min-w-0">
              <Input
                type="datetime-local"
                value={watch("offer_date")}
                onChange={(e) => setValue("offer_date", e.target.value)}
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] h-7 w-full text-xs hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Contact Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-xs w-16 flex-shrink-0">
              Επαφή:
            </div>
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <GlobalDropdown
                  options={contactOptions}
                  value={getContactNameById(selectedContactId || "")}
                  onSelect={(name) => {
                    // Find the contact ID by the display name (which includes position)
                    const contactEntry = Object.entries(contactDisplayMap).find(([_, value]) => value === name);
                    if (contactEntry) {
                      setSelectedContactId(contactEntry[0]);
                    }
                  }}
                  placeholder="Επιλέξτε επαφή"
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-xs truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200"
                  disabled={contacts.length === 0}
                />
              </div>
              <button
                type="button"
                className="h-7 w-7 p-0 ml-1 text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3e46] hover:border-yellow-400 border border-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                onClick={() => {
                  setShowContactDialog(true);
                }}
                title="Προσθήκη Επαφής"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <DialogDescription id="offer-dialog-description" className="sr-only">
        {isEditing ? "Φόρμα επεξεργασίας προσφοράς" : "Φόρμα δημιουργίας νέας προσφοράς"}
      </DialogDescription>
    </DialogHeader>
  );
};

export default DialogHeaderSection; 