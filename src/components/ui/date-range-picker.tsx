import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DateRangePickerProps {
  date?: {
    from: Date;
    to: Date;
  };
  onChange?: (date: { from: Date; to: Date }) => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

/**
 * DateRangePicker Component
 * A component that allows users to select a date range.
 */
export function DateRangePicker({
  date,
  onChange,
  align = 'start',
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const initialDate = date || {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date()
  };
  
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: Date;
    to: Date;
  }>(initialDate);

  // Handle calendar date change
  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const from = !selectedDateRange.from || selectedDateRange.to 
        ? selectedDate 
        : selectedDateRange.from;
      
      const to = selectedDateRange.from && !selectedDateRange.to 
        ? selectedDate 
        : selectedDateRange.to;

      const newRange = 
        selectedDateRange.from && selectedDateRange.to
          ? { from: selectedDate, to: selectedDate }
          : { from, to };

      setSelectedDateRange(newRange);
      
      // Only call onChange when a complete range is selected
      if (newRange.from && newRange.to) {
        onChange?.(newRange);
      }
    }
  };

  // Handle preset selections
  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    const newRange = { from, to };
    setSelectedDateRange(newRange);
    onChange?.(newRange);
    setIsOpen(false);
  };

  // Format the selected date range for display
  const formatDateRange = () => {
    if (!selectedDateRange.from) {
      return 'Select date range';
    }

    if (!selectedDateRange.to) {
      return format(selectedDateRange.from, 'PP');
    }

    return `${format(selectedDateRange.from, 'PP')} - ${format(selectedDateRange.to, 'PP')}`;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !selectedDateRange.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="flex flex-col sm:flex-row gap-2 p-2 border-b">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(7)}
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(14)}
              >
                Last 14 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(30)}
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(90)}
              >
                Last 90 days
              </Button>
            </div>
          </div>
          <Calendar
            mode="range"
            selected={selectedDateRange}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setSelectedDateRange(range as { from: Date; to: Date });
                onChange?.(range as { from: Date; to: Date });
                setIsOpen(false);
              } else if (range?.from) {
                setSelectedDateRange({ ...selectedDateRange, from: range.from });
              }
            }}
            initialFocus
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
} 
