import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchBarCustomDropdown } from "@/components/ui/custom-dropdown";

// Support both formats of column definitions
interface SearchBarProps {
  onChange: (value: string) => void;
  value: string;
  options: { value: string; label: string }[]; // Options for the dropdown
  selectedColumn: string; // Currently selected column
  onColumnChange: (column: string) => void; // Function to handle column change
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  onChange,
  value,
  options,
  selectedColumn,
  onColumnChange,
  placeholder = "Αναζήτηση...",
  className = "",
}: SearchBarProps) {
  const [dropdownWidth, setDropdownWidth] = useState(120);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Create a temporary span to measure text width
    if (spanRef.current) {
      const span = spanRef.current;
      
      // Find the longest option text
      let maxWidth = 0;
      options.forEach(option => {
        span.textContent = option.label;
        const width = span.getBoundingClientRect().width;
        if (width > maxWidth) {
          maxWidth = width;
        }
      });

      // Calculate total width:
      // 1. Longest option text width
      // 2. Down arrow width (20px)
      // 3. Padding (30px)
      const downArrowWidth = 20;
      const paddingWidth = 30;
      const totalWidth = maxWidth + downArrowWidth + paddingWidth;

      // Set a minimum width of 120px
      setDropdownWidth(Math.max(totalWidth, 120));
    }
  }, [options]);

  // Wrapper function to convert column change to synthetic event
  const handleColumnChange = (column: string) => {
    const syntheticEvent = {
      target: {
        name: 'column',
        value: column
      }
    } as React.ChangeEvent<HTMLSelectElement>;
    
    onColumnChange(column);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Hidden span for width calculation */}
      <span 
        ref={spanRef} 
        className="absolute opacity-0 pointer-events-none" 
        style={{ 
          fontSize: '14px', 
          fontFamily: 'inherit',
          visibility: 'hidden',
          position: 'absolute'
        }}
      />

      <div className="flex border border-[#52796f] rounded-lg overflow-hidden bg-[#2f3e46]">
        {/* Search input container - fixed width */}
        <div className="w-[150px] lg:w-[200px] flex-shrink-0">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full bg-transparent text-[#cad2c5] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Αναζήτηση..."
          />
        </div>
        
        {/* Dropdown container - separate from input */}
        <div className="h-9 flex-shrink-0 flex items-center" style={{ 
          width: `${dropdownWidth + 40}px`, // Add more extra space
          minWidth: "150px" // Ensure minimum width
        }}>
          <SearchBarCustomDropdown
            options={options}
            value={selectedColumn}
            onChange={(e) => handleColumnChange(e.target.value)}
            className="text-[#cad2c5] w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
