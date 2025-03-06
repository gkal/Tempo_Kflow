import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
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
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setSelectedOption(value);
  }, [value]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }

    function handleClickOutside(event: MouseEvent) {
      // Only close if clicking outside both the dropdown and the menu
      const target = event.target as Node;
      const dropdownMenu = document.querySelector('.dropdown-menu');
      
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) && 
        dropdownMenu && 
        !dropdownMenu.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    onSelect(option);
    setIsOpen(false);
  };

  // Render the dropdown menu using a portal
  const renderDropdownMenu = () => {
    if (!isOpen) return null;
    
    return ReactDOM.createPortal(
      <div 
        className="dropdown-menu" 
        style={{
          top: `${buttonPosition.top}px`,
          left: `${buttonPosition.left}px`,
          width: `${buttonPosition.width}px`,
          minWidth: `${buttonPosition.width}px`,
          zIndex: 9999, // Explicitly set z-index here as well
          pointerEvents: 'auto' // Ensure clicks are captured
        }}
        onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling
      >
        {options.map((option) => (
          <div
            key={option}
            className={`dropdown-item text-sm ${
              option === selectedOption ? "selected-item" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              handleSelect(option);
            }}
          >
            {option}
          </div>
        ))}
      </div>,
      document.body
    );
  };

  // Button style with standard input background color
  const buttonStyle = {
    backgroundColor: '#2f3e46', // Standard input background color
    color: '#cad2c5',
    border: 'none',
    boxShadow: isHovered || isOpen ? '0 0 0 1px #84a98c' : 'none',
    transition: 'all 0.2s ease',
  };

  return (
    <div className={`GlobalDropdown ${className}`} ref={dropdownRef}>
      {header && <div className="text-sm font-medium mb-1 text-[#cad2c5]">{header}</div>}
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md focus:outline-none text-[#cad2c5]"
        style={buttonStyle}
      >
        <span>{selectedOption || placeholder}</span>
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {renderDropdownMenu()}
    </div>
  );
} 