import React, { useRef, useState, useContext, useEffect } from 'react';
import { GlobalDropdown } from '@/components/ui/GlobalDropdown';
import { Calendar, Phone, Plus } from 'lucide-react';
import { OfferDialogContext } from './OfferDialogContext';
import { dateFormatUtils } from './FormUtils';

interface HeaderSectionProps {
  customerName: string;
  customerPhone: string;
  contacts: any[];
  contactOptions: string[];
  selectedContactId: string | null;
  setSelectedContactId: (id: string | null) => void;
  setShowContactDialog: (show: boolean) => void;
  getContactDisplayNameById: (id: string) => string;
}

const HeaderSection: React.FC<HeaderSectionProps> = ({
  customerName,
  customerPhone,
  contacts,
  contactOptions,
  selectedContactId,
  setSelectedContactId,
  setShowContactDialog,
  getContactDisplayNameById
}) => {
  const context = useContext(OfferDialogContext);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Toggle calendar
  const toggleCalendar = () => {
    if (!isCalendarOpen && dateButtonRef.current) {
      const rect = dateButtonRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX + (rect.width / 2) - 160 // 160 is half of 320px calendar width
      });
      setCalendarDate(new Date()); // Reset to current month when opening calendar
    }
    setIsCalendarOpen(!isCalendarOpen);
  };

  // Handle outside clicks for date picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isCalendarOpen &&
        dateButtonRef.current &&
        !dateButtonRef.current.contains(event.target as Node) &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  if (!context) return null;

  const { watch, setValue, getSourceLabel, getSourceValue, sourceOptions } = context;

  return (
    <>
      {/* Header with customer name, phone, and title - outside of border */}
      <div className="flex items-center px-2 py-1 mx-10 mt-0">
        <div className="flex items-center">
          <div className="text-xl font-semibold">{customerName || "Πελάτης"}</div>
          {customerPhone && (
            <div className="text-sm text-gray-300 ml-2 flex items-center">
              <Phone className="h-3 w-3 mr-1" />
              {customerPhone}
            </div>
          )}
          <div className="mx-2 h-4 border-l border-gray-400"></div>
          <div className="text-sm text-gray-300">
            Νέα Προσφορά
          </div>
        </div>
      </div>

      {/* Border box with fields */}
      <div className="flex flex-col bg-[#354f52] border border-[#52796f] rounded-md mx-10 mb-2 mt-1">
        {/* Source, Date, Contact controls inside border */}
        <div className="flex justify-center px-3 py-3 gap-8">
          {/* Source Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm mr-2 min-w-[45px]">
              Πηγή:
            </div>
            <div className="min-w-[150px]">
              <GlobalDropdown
                options={sourceOptions.map(option => option.label)}
                value={getSourceLabel(watch("source"))}
                onSelect={(label) => setValue("source", getSourceValue(label))}
                placeholder="Επιλέξτε πηγή"
                className="bg-[#2a3b42] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
              />
            </div>
          </div>
          
          {/* Date Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm mr-1">
              Ημ/νία:
            </div>
            <div className="min-w-[170px] relative">
              <button
                ref={dateButtonRef}
                type="button"
                onClick={toggleCalendar}
                className="bg-[#2a3b42] border border-[#52796f] text-[#cad2c5] h-8 w-full text-sm rounded-md px-3 text-left hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] focus:shadow-[0_0_0_2px_#52796f] focus:outline-none transition-all duration-200 flex items-center justify-between"
              >
                <span className="truncate">{dateFormatUtils.formatDateDisplay(watch("created_at"))}</span>
                <Calendar className="h-4 w-4 text-[#84a98c] flex-shrink-0" />
              </button>
              
              {isCalendarOpen && (
                <div 
                  ref={calendarRef}
                  className="absolute z-[100] mt-1 bg-[#2f3e46] border border-[#52796f] rounded-md shadow-lg p-2"
                  style={{ 
                    width: '320px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: '100%'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CalendarPopup 
                    calendarDate={calendarDate}
                    setCalendarDate={setCalendarDate}
                    watch={watch}
                    setValue={setValue}
                    setIsCalendarOpen={setIsCalendarOpen}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Contact Field */}
          <div className="flex items-center">
            <div className="text-[#a8c5b5] text-sm mr-2 min-w-[45px]">
              Επαφή:
            </div>
            <div className="min-w-[170px]">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <GlobalDropdown
                    options={contactOptions}
                    value={selectedContactId ? getContactDisplayNameById(selectedContactId) : ""}
                    onSelect={(value) => {
                      // Find the contact ID by display name
                      const foundContact = contacts.find(
                        contact => contact.full_name === value
                      );
                      
                      if (foundContact) {
                        setSelectedContactId(foundContact.id);
                      }
                    }}
                    placeholder="Επιλέξτε επαφή"
                    disabled={contactOptions.length === 0}
                    className="bg-[#2a3b42] border-[#52796f] text-[#cad2c5] text-sm truncate hover:border-[#84a98c] hover:shadow-[0_0_0_1px_#52796f] transition-all duration-200 h-8"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowContactDialog(true)}
                  className="ml-1 bg-transparent h-7 w-7 rounded-full flex items-center justify-center border border-[#f9c74f] hover:bg-[#354f52] transition-all duration-200 group"
                  aria-label="Add new contact"
                >
                  <Plus className="h-4 w-4 text-[#f9c74f] group-hover:text-[#84a98c]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Calendar popup component
interface CalendarPopupProps {
  calendarDate: Date;
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
  watch: any;
  setValue: any;
  setIsCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CalendarPopup: React.FC<CalendarPopupProps> = ({
  calendarDate,
  setCalendarDate,
  watch,
  setValue,
  setIsCalendarOpen
}) => {
  return (
    <>
      <h2 id="calendar-dialog-title" className="sr-only">Επιλογή Ημερομηνίας</h2>
      <div className="flex flex-col">
        {/* Enhanced calendar with month navigation */}
        <div className="mb-2">
          {/* Month and year header with navigation */}
          <div className="flex items-center justify-between mb-2">
            <button 
              type="button"
              className="text-[#84a98c] hover:text-[#cad2c5] px-2 py-1 text-lg font-semibold"
              onClick={() => {
                const newDate = new Date(calendarDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCalendarDate(newDate);
              }}
            >
              ‹
            </button>
            <div className="text-center text-[#cad2c5] font-semibold">
              {calendarDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
            </div>
            <button 
              type="button"
              className="text-[#84a98c] hover:text-[#cad2c5] px-2 py-1 text-lg font-semibold"
              onClick={() => {
                const newDate = new Date(calendarDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCalendarDate(newDate);
              }}
            >
              ›
            </button>
          </div>
          
          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1">
            {['Δε', 'Τρ', 'Τε', 'ΠΕ', 'Πα', 'Σα', 'Κυ'].map(day => (
              <div key={day} className="text-center text-[#84a98c] text-xs font-medium">
                {day}
              </div>
            ))}
          </div>
            
          {/* Calendar grid with previous/next month days */}
          <div className="grid grid-cols-7 gap-1 mt-1">
            {(() => {
              const today = new Date();
              const currentMonth = calendarDate.getMonth();
              const currentYear = calendarDate.getFullYear();
              
              // Create date for first day of month
              const firstDay = new Date(currentYear, currentMonth, 1);
              // Get day of week (0 = Sunday, 1 = Monday, etc.)
              let firstDayOfWeek = firstDay.getDay();
              // Adjust for Monday start (0 = Monday, 6 = Sunday)
              firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
              
              // Last day of current month
              const lastDay = new Date(currentYear, currentMonth + 1, 0);
              const daysInMonth = lastDay.getDate();
              
              // Get days from previous month
              const prevMonth = new Date(currentYear, currentMonth, 0);
              const prevMonthDays = prevMonth.getDate();
              
              // Calendar cells array
              const calendarCells = [];
              
              // Add days from previous month
              for (let i = 0; i < firstDayOfWeek; i++) {
                const day = prevMonthDays - firstDayOfWeek + i + 1;
                const date = new Date(currentYear, currentMonth - 1, day);
                calendarCells.push({
                  day,
                  date,
                  type: 'prev-month'
                });
              }
              
              // Add days of current month
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentYear, currentMonth, day);
                const isToday = day === today.getDate() && 
                                currentMonth === today.getMonth() && 
                                currentYear === today.getFullYear();
                calendarCells.push({
                  day,
                  date,
                  type: 'current-month',
                  isToday
                });
              }
              
              // Add days from next month to fill the grid
              const totalCellsNeeded = 42; // 6 rows × 7 days
              const nextMonthDays = totalCellsNeeded - calendarCells.length;
              for (let day = 1; day <= nextMonthDays; day++) {
                const date = new Date(currentYear, currentMonth + 1, day);
                calendarCells.push({
                  day,
                  date,
                  type: 'next-month'
                });
              }
              
              // Return the calendar cells
              return calendarCells.map((cell, index) => {
                let className = 'text-center py-1 text-xs h-6 w-6 mx-auto flex items-center justify-center';
                
                if (cell.type === 'current-month') {
                  if (cell.isToday) {
                    className += ' bg-[#52796f] text-white font-bold rounded-full';
                  } else {
                    className += ' text-[#cad2c5] hover:bg-[#52796f] hover:text-white hover:rounded-full';
                  }
                } else {
                  // Previous or next month days
                  className += ' text-[#a8c5b5] opacity-50 hover:opacity-80 hover:bg-[#354f52] hover:rounded-full';
                }
                
                return (
                  <button
                    key={`cell-${index}`}
                    type="button"
                    onClick={() => {
                      // Get current date value from form if exists
                      const currentFormDate = watch("created_at");
                      let selectedDate = new Date(cell.date);

                      if (currentFormDate) {
                        // If editing, preserve the existing time
                        const existingDate = new Date(currentFormDate);
                        selectedDate.setHours(
                          existingDate.getHours(),
                          existingDate.getMinutes(),
                          existingDate.getSeconds(),
                          existingDate.getMilliseconds()
                        );
                      } else {
                        // If new offer, use current time
                        const now = new Date();
                        selectedDate.setHours(
                          now.getHours(),
                          now.getMinutes(),
                          now.getSeconds(),
                          0  // Reset milliseconds for consistency
                        );
                      }

                      const dateString = selectedDate.toISOString();
                      setValue("created_at", dateString);
                      setIsCalendarOpen(false);
                    }}
                    className={className}
                  >
                    {cell.day}
                  </button>
                );
              });
            })()}
          </div>
        </div>
        
        {/* Today button */}
        <div className="flex justify-center mt-2 border-t border-[#52796f] pt-2">
          <button 
            type="button"
            className="text-[#84a98c] hover:text-[#cad2c5] text-xs px-2 py-1 rounded-md hover:bg-[#354f52]"
            onClick={() => {
              const today = new Date();
              const dateString = today.toISOString();
              setValue("created_at", dateString);
              setCalendarDate(today);
              setIsCalendarOpen(false);
            }}
          >
            Σήμερα
          </button>
        </div>
      </div>
    </>
  );
};

export default HeaderSection; 