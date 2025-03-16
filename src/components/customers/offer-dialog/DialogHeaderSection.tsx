import React, { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { Plus, Phone } from "lucide-react";

const DialogHeaderSection = ({ 
  customerName,
  customerPhone,
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
  // Format the date for display in Greek format
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) + " " + date.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Handle date picker click
  const handleDateClick = () => {
    const tempInput = document.createElement('input');
    tempInput.type = 'datetime-local';
    tempInput.value = watch("offer_date");
    tempInput.style.position = 'fixed';
    tempInput.style.top = '50%';
    tempInput.style.left = '50%';
    tempInput.style.transform = 'translate(-50%, -50%)';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    
    tempInput.addEventListener('change', (e) => {
      setValue("offer_date", (e.target as HTMLInputElement).value);
      document.body.removeChild(tempInput);
    });
    
    tempInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.body.contains(tempInput)) {
          document.body.removeChild(tempInput);
        }
      }, 300);
    });
    
    tempInput.click();
  };

  return (
    <DialogHeader className="p-2 max-w-full overflow-hidden">
      <div className="flex flex-wrap justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <div className="text-[#a8c5b5] text-lg font-medium truncate max-w-[200px]">
            {customerName || "Πελάτης"}
          </div>
          {customerPhone && (
            <div className="flex items-center gap-1 text-[#cad2c5] text-sm">
              <Phone className="h-3 w-3" />
              <span>{customerPhone}</span>
            </div>
          )}
          <div className="h-4 w-px bg-[#52796f] mx-1"></div>
          <DialogTitle className="text-[#cad2c5] text-sm cursor-default">
            {isEditing ? "Επεξεργασία Προσφοράς" : "Νέα Προσφορά"}
          </DialogTitle>
        </div>
        <div>
          {/* Empty div to maintain layout */}
        </div>
      </div>
      
      {/* Date and Contact Section */}
      <div className="bg-[#354f52] rounded-md p-2 mt-0 w-full max-w-full border border-[#52796f] overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Source Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm w-10 flex-shrink-0">
              Πηγή:
            </div>
            <div className="flex-1 min-w-0 max-w-[180px]">
              <GlobalDropdown
                options={sourceOptions.map(option => option.label)}
                value={getSourceLabel(watch("source"))}
                onSelect={(label) => setValue("source", getSourceValue(label))}
                placeholder="Επιλέξτε πηγή"
                className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
              />
            </div>
          </div>
          
          {/* Date Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm w-10 flex-shrink-0">
              Ημ:
            </div>
            <div className="flex-1 min-w-0 max-w-[180px]">
              <button
                type="button"
                onClick={handleDateClick}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] h-8 w-full text-sm rounded-md px-2 text-left hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200"
              >
                {formatDateForDisplay(watch("offer_date"))}
              </button>
            </div>
          </div>
          
          {/* Contact Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm w-8 flex-shrink-0">
              <span className="-ml-4">Επαφή:</span>
            </div>
            <div className="flex items-center flex-1 min-w-0 max-w-[320px]">
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
                  className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
                  disabled={contacts.length === 0}
                />
              </div>
              <button
                type="button"
                className="h-8 w-8 p-0 ml-1 text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3e46] hover:border-yellow-400 border border-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
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