import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import "../ui/dropdown.css";

interface GlobalDropdownProps {
  options: string[];
  onSelect: (option: string) => void;
  placeholder?: string;
  value?: string;
  header?: string;
  className?: string;
}

export function GlobalDropdown({
  options,
  onSelect,
  placeholder = "Select an option",
  value,
  header,
  className = "",
}: GlobalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedOption(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div className={`GlobalDropdown ${className}`} ref={dropdownRef}>
      {header && <div className="text-sm font-medium mb-1">{header}</div>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-[#2f3e46] border border-[#52796f] rounded-md focus:outline-none focus:ring-2 focus:ring-[#84a98c]"
      >
        <span>{selectedOption || placeholder}</span>
        <ChevronDown className="h-4 w-4 ml-2" />
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          {options.map((option) => (
            <div
              key={option}
              className={`dropdown-item text-sm ${
                option === selectedOption ? "bg-[#52796f] text-[#cad2c5]" : ""
              }`}
              onClick={() => handleSelect(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 