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
  contacts
}) => {
  return (
    <DialogHeader className="p-5 border-b border-[#52796f] bg-[#3a5258]">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="text-[#a8c5b5] text-base font-medium mr-2">
            {customerName}
          </div>
          <DialogTitle className="text-[#cad2c5] text-base cursor-default">
            {isEditing ? "Επεξεργασία Προσφοράς" : "Νέα Προσφορά"}
          </DialogTitle>
        </div>
        <div>
          {/* Empty div to maintain layout */}
        </div>
      </div>
      
      {/* Date and Contact Section */}
      <div className="bg-[#354f52] rounded-md border border-[#52796f] p-3 mt-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm mr-2 w-24">
              Ημερομηνία:
            </div>
            <Input
              type="datetime-local"
              value={watch("offer_date")}
              onChange={(e) => setValue("offer_date", e.target.value)}
              className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] h-8 w-44 hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none"
            />
          </div>
          
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm mr-2">
              Επαφή:
            </div>
            <div className="flex items-center w-80">
              <div className="flex-1 contact-dropdown">
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
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5]"
                  disabled={contacts.length === 0}
                />
              </div>
              <button
                type="button"
                className="h-8 w-8 p-0 ml-2 text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3e46] border border-yellow-600 rounded-full flex items-center justify-center"
                onClick={() => {
                  setShowContactDialog(true);
                }}
                title="Προσθήκη Επαφής"
              >
                <Plus className="h-4 w-4" />
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