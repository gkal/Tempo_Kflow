import React, { useState, useEffect, useRef } from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GlobalDropdown } from "@/components/ui/GlobalDropdown";
import { Plus, Phone, Calendar } from "lucide-react";
import { DayPicker } from 'react-day-picker';
import { el } from 'date-fns/locale';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { createPortal } from 'react-dom';

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
  // Date picker state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const dateButtonRef = useRef(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });

  // Format the date for display in Greek format
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("el-GR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) + " " + date.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Toggle calendar
  const toggleCalendar = () => {
    if (!isCalendarOpen && dateButtonRef.current) {
      const rect = dateButtonRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX + (rect.width / 2) - 160 // 160 is half of 320px calendar width
      });
    }
    setIsCalendarOpen(!isCalendarOpen);
  };

  // Get current date or default to now
  const getCurrentDate = () => {
    return watch("offer_date") ? new Date(watch("offer_date")) : new Date();
  };

  // Handle day selection
  const handleSelectDay = (day) => {
    if (!day) return;
    
    try {
      // Current date from form
      const currentTime = getCurrentDate();
      
      // New date with selected day but keep time
      const newDate = new Date(day);
      newDate.setHours(currentTime.getHours());
      newDate.setMinutes(currentTime.getMinutes());
      newDate.setSeconds(currentTime.getSeconds());
      newDate.setMilliseconds(0); // Reset milliseconds for consistency
      
      // Format date for ISO string
      const dateString = newDate.toISOString();
      
      // Update only created_at field since offer_date doesn't exist in the database
      setValue("created_at", dateString, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true 
      });
      
      // Keep the offer_date synchronized for the UI, but this won't be saved to DB
      setValue("offer_date", dateString, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true 
      });
      
      // Close calendar
      setIsCalendarOpen(false);
    } catch (error) {
      console.error("Error selecting day:", error);
    }
  };

  // Set today's date
  const handleTodayClick = (e) => {
    e.preventDefault();
    try {
      const today = new Date();
      const currentTime = getCurrentDate();
      
      // Keep time
      today.setHours(currentTime.getHours());
      today.setMinutes(currentTime.getMinutes());
      today.setSeconds(currentTime.getSeconds());
      today.setMilliseconds(0); // Reset milliseconds for consistency
      
      // Format date for proper database saving
      const dateString = today.toISOString();
      
      // Update only created_at field since offer_date doesn't exist in the database
      setValue("created_at", dateString, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true 
      });
      
      // Keep the offer_date synchronized for the UI, but this won't be saved to DB
      setValue("offer_date", dateString, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true 
      });
      
      // Close calendar
      setIsCalendarOpen(false);
    } catch (error) {
      console.error("Error setting today:", error);
    }
  };

  // Handle outside clicks
  useEffect(() => {
    const closeCalendar = (e) => {
      if (
        isCalendarOpen &&
        dateButtonRef.current &&
        !dateButtonRef.current.contains(e.target) &&
        !e.target.closest('.rdp') // Don't close if click is inside calendar
      ) {
        setIsCalendarOpen(false);
      }
    };
    
    document.addEventListener('mousedown', closeCalendar);
    return () => document.removeEventListener('mousedown', closeCalendar);
  }, [isCalendarOpen]);

  // Render calendar using portal
  const renderCalendar = () => {
    if (!isCalendarOpen) return null;
    
    return createPortal(
      <div 
        className="rdp p-3 bg-[#2f3e46] border border-[#52796f] rounded-md shadow-xl"
        style={{ 
          position: 'absolute',
          top: `${calendarPosition.top}px`,
          left: `${calendarPosition.left}px`,
          width: '320px',
          zIndex: 2147483647,
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DayPicker
          mode="single"
          defaultMonth={watch("offer_date") ? new Date(watch("offer_date")) : undefined}
          selected={watch("offer_date") ? new Date(watch("offer_date")) : undefined}
          onSelect={handleSelectDay}
          locale={el}
          showOutsideDays={true}
          className="bg-[#2f3e46] text-[#cad2c5] pointer-events-auto"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            caption: "flex justify-center pt-1 relative items-center mb-2",
            caption_label: "text-sm font-medium text-[#cad2c5]",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-[#cad2c5]",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "grid grid-cols-7 mb-1 gap-x-1",
            head_cell: "text-[#84a98c] rounded-md font-normal text-[0.7rem] text-center flex justify-center items-center",
            row: "grid grid-cols-7 mt-1 gap-x-1",
            cell: "text-center p-0 relative flex justify-center items-center [&:has([aria-selected])]:bg-[#354f52] first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-8 w-8 p-0 font-normal flex items-center justify-center text-[#cad2c5] text-xs aria-selected:opacity-100 hover:bg-[#3a5258] rounded-md focus:outline-none focus:bg-[#52796f]",
            day_selected: "bg-[#52796f] text-[#cad2c5] hover:bg-[#52796f] focus:bg-[#52796f] font-medium",
            day_today: "bg-[#354f52] text-[#cad2c5] font-medium",
            day_outside: "text-[#84a98c] opacity-30 hover:opacity-70 text-xs",
            day_disabled: "text-[#84a98c] opacity-50",
            day_range_middle: "aria-selected:bg-[#354f52] aria-selected:text-[#cad2c5]",
            day_hidden: "invisible",
          }}
          footer={
            <button
              onClick={handleTodayClick}
              className="w-full mt-4 bg-[#52796f] text-[#cad2c5] h-9 rounded-md hover:bg-[#52796f]/90 transition-colors"
            >
              Σήμερα
            </button>
          }
        />
      </div>,
      document.body
    );
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
            <div className="text-[#a8c5b5] text-sm w-14 flex-shrink-0">
              Ημ/νία:
            </div>
            <div className="flex-1 min-w-0 max-w-[200px] relative">
              <button
                ref={dateButtonRef}
                type="button"
                onClick={toggleCalendar}
                className="bg-[#2f3e46] border border-[#52796f] text-[#cad2c5] h-9 w-full text-sm rounded-md px-3 text-left hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200 flex items-center justify-between"
              >
                <span className="truncate">{formatDateForDisplay(watch("offer_date"))}</span>
                <Calendar className="h-4 w-4 text-[#84a98c] flex-shrink-0" />
              </button>
              
              {renderCalendar()}
            </div>
          </div>
          
          {/* Contact Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm w-10 flex-shrink-0">
              Επαφή:
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