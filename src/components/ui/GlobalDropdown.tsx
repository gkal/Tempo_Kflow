import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { ChevronDown, Edit } from "lucide-react";
import "../ui/dropdown.css";

interface GlobalDropdownProps {
  options: string[];
  onSelect: (option: string) => void;
  onEdit?: (option: string) => void;
  placeholder?: string;
  value?: string;
  header?: string;
  className?: string;
  disabled?: boolean;
  renderOption?: (option: string) => React.ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
  showEditButton?: boolean;
}

export function GlobalDropdown({
  options,
  onSelect,
  onEdit,
  placeholder = "Select an option",
  value,
  header,
  className = "",
  disabled = false,
  renderOption,
  onContextMenu,
  showEditButton = false,
}: GlobalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(value);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setSelectedOption(value);
  }, [value]);

  // Reset state when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setHoveredItem(null);
    }
  }, [isOpen]);

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

  // Handle wheel scrolling in the dropdown menu
  const handleWheel = (e: React.WheelEvent) => {
    // Prevent the default behavior to avoid page scrolling
    e.stopPropagation();
    
    // Get the dropdown menu element
    const dropdownMenu = e.currentTarget as HTMLDivElement;
    
    // Scroll the dropdown menu
    dropdownMenu.scrollTop += e.deltaY;
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
          zIndex: 9999,  // Much higher to ensure it's above other elements
          pointerEvents: 'auto',
          maxHeight: '300px',
          overflowY: 'auto',
          position: 'fixed' // Use fixed positioning to ensure it's always visible
        }}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        {options.map((option) => (
          <div
            key={option}
            className={`dropdown-item text-sm ${
              option === selectedOption ? "selected-item" : ""
            } relative group`}
            onMouseEnter={() => setHoveredItem(option)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(option);
            }}
          >
            <div className="flex justify-between items-center w-full pr-2">
              <span>{renderOption ? renderOption(option) : option}</span>
              {hoveredItem === option && option !== "add_new_position" && showEditButton && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) {
                      onEdit(option);
                      setIsOpen(false);
                    }
                  }}
                  className="text-[#84a98c] hover:text-[#52796f] transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
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
    border: '1px solid #52796f',
    boxShadow: isHovered || isOpen ? '0 0 0 1px #84a98c' : 'none',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    height: '100%'
  };

  // Render the selected value or placeholder
  const renderSelectedValue = () => {
    if (!selectedOption) return placeholder;
    return renderOption ? renderOption(selectedOption) : selectedOption;
  };

  return (
    <div 
      className={`GlobalDropdown ${className}`} 
      ref={dropdownRef}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onContextMenu && value && value !== "add_new_position") {
          onContextMenu(e);
        }
      }}
      style={{ height: '100%' }}
    >
      {header && <div className="text-sm font-medium mb-1 text-[#cad2c5]">{header}</div>}
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onContextMenu && !disabled && value && value !== "add_new_position") {
            onContextMenu(e);
          }
        }}
        onMouseEnter={() => !disabled && setIsHovered(true)}
        onMouseLeave={() => !disabled && setIsHovered(false)}
        className="flex items-center justify-between w-full px-3 py-1 text-sm rounded-md focus:outline-none text-[#cad2c5] h-full"
        style={buttonStyle}
        disabled={disabled}
      >
        <span className="truncate">{renderSelectedValue()}</span>
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {renderDropdownMenu()}
    </div>
  );
} 