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

  // Update the custom styles to remove borders on hover
  const customStyles = `
    .search-input::placeholder {
      color: #84a98c !important;
    }
    .search-input {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
    }
    .search-input:focus {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
    }
    .search-input:hover {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
    }
    /* Remove any borders from the search container on hover */
    .search-container:hover .search-input {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
    }
    /* Ensure no borders appear on the input itself */
    input.search-input {
      border-width: 0 !important;
      outline-width: 0 !important;
    }
  `;

  // Updated selection styles with more specific selectors
  const searchBarStyles = `
    /* Override the yellow highlight with our green theme */
    .search-input::selection,
    input::selection,
    .search-bar-container *::selection {
      background-color: #52796f !important;
      color: #cad2c5 !important;
    }
    
    .search-input::-moz-selection,
    input::-moz-selection,
    .search-bar-container *::-moz-selection {
      background-color: #52796f !important;
      color: #cad2c5 !important;
    }
  `;

  return (
    <>
      <style>{customStyles}</style>
      <style>{searchBarStyles}</style>
      <div className={`search-container flex items-center rounded-md border border-[#52796f] bg-[#2f3e46] ${className}`}>
        <div className="flex items-center px-3 py-2">
          <Search className="h-4 w-4 text-[#84a98c]" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="search-input flex-grow bg-transparent py-2 text-sm"
          style={{
            outline: 'none',
            border: 'none',
            boxShadow: 'none'
          }}
        />
        <SearchBarCustomDropdown
          options={options}
          value={selectedColumn}
          onChange={(e) => handleColumnChange(e.target.value)}
          className="min-w-[150px]"
        />
      </div>
    </>
  );
}
