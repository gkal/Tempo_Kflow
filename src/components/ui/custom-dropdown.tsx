import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { Check, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomDropdownProps {
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface SearchBarDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  className?: string;
  disabled?: boolean;
}

// Simple dropdown component
const BaseCustomDropdown: React.FC<CustomDropdownProps> = ({
  options = [],
  value = '',
  onChange,
  name = '',
  className = '',
  disabled = false,
  placeholder = "Select..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Find the selected option
  const selectedOption = useMemo(() => {
    if (!options || options.length === 0) return null;
    const found = options.find(opt => opt.value === value) || null;
    return found;
  }, [options, value]);

  // Handle option selection
  const handleSelect = (optionValue: string) => {
    if (disabled) {
      return;
    }
    
    onChange?.({
      target: {
        name: name || '',
        value: optionValue,
      }
    } as React.ChangeEvent<HTMLSelectElement>);
    
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Show placeholder if no options
  if (!options || options.length === 0) {
    return (
      <div className={`w-full text-sm text-gray-500 ${className}`}>
        No options available
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={cn(
          "w-full px-3 py-2 text-sm border rounded-md flex justify-between items-center",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        )}
        disabled={disabled}
        onClick={() => {
          toggleDropdown();
        }}
      >
        <span className="text-right w-full pr-2 truncate">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-transform", 
            isOpen ? "rotate-180" : ""
          )} 
        />
      </button>
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="dropdown-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            // Close when clicking the overlay
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className="flex min-h-screen items-end justify-center text-center sm:block">
            <div 
              className="absolute inset-0 bg-black bg-opacity-30 transition-opacity" 
              aria-hidden="true"
              onClick={() => setIsOpen(false)}
            ></div>
            
            <div 
              className="absolute left-0 right-0 top-20 mx-auto w-full max-w-md transform overflow-hidden rounded-lg bg-white p-4 text-left shadow-xl transition-all"
              style={{
                position: 'absolute',
                top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + window.scrollY : '100px',
                left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left + window.scrollX : '0',
                width: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().width : '100%',
                zIndex: 9999
              }}
            >
              <div className="py-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option.value);
                    }}
                    className={cn(
                      "w-full text-right px-4 py-2 text-sm flex justify-between items-center",
                      "hover:bg-gray-100",
                      option.value === value ? "bg-blue-100" : ""
                    )}
                  >
                    <span className="flex-grow text-right">{option.label}</span>
                    {option.value === value && (
                      <Check className="h-4 w-4 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom memoization
const CustomDropdown = React.memo(BaseCustomDropdown);

// Search bar dropdown component
const SearchBarCustomDropdown: React.FC<SearchBarDropdownProps> = ({
  options,
  value,
  onChange,
  name = '',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasReceivedOptions, setHasReceivedOptions] = useState(false);
  const prevOptionsRef = useRef<{ value: string; label: string }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, width: number}>({
    top: 0,
    left: 0,
    width: 0
  });
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  // Create portal container when component mounts
  useEffect(() => {
    const container = document.createElement('div');
    container.setAttribute('data-dropdown-portal', 'true');
    document.body.appendChild(container);
    setPortalContainer(container);
    
    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // Calculate dynamic width based on longest option
  const calculateDropdownWidth = () => {
    const currentOptions = options.length > 0 ? options : prevOptionsRef.current;
    
    // Find the longest label
    const longestLabel = currentOptions.reduce((longest, current) => 
      current.label.length > longest.length ? current.label : longest
    , '');

    // Estimate width based on label length and add space for arrows
    // Approximate 7px per character, 40px for arrows and padding, plus 20px standard extra
    const estimatedLabelWidth = longestLabel.length * 7;
    const calculatedWidth = estimatedLabelWidth + 40 + 20;

    return calculatedWidth;
  };

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const calculatedWidth = calculateDropdownWidth();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX,
        width: Math.max(calculatedWidth, rect.width) // Use the larger of calculated width or trigger width
      });
    }
  }, [isOpen, options]);

  // Update state when options are received
  useEffect(() => {
    if (options.length > 0) {
      setHasReceivedOptions(true);
      prevOptionsRef.current = options;
    }
  }, [options]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled && (options.length > 0 || prevOptionsRef.current.length > 0)) {
      setIsOpen(!isOpen);
    }
  };

  // Use current options or previous options if available
  const currentOptions = options.length > 0 ? options : prevOptionsRef.current;
  
  // Find the selected option
  const selectedOption = useMemo(() => {
    if (currentOptions.length === 0) {
      return null;
    }
    
    const directMatch = currentOptions.find(opt => opt.value === value);
    const fallbackMatch = value ? currentOptions.find(opt => opt.value === value.split('_')[0]) : null;
    const result = directMatch || fallbackMatch || currentOptions[0];
    
    return result;
  }, [currentOptions, value]);

  // Handle option selection
  const handleSelect = (optionValue: string) => {
    if (disabled) {
      return;
    }
    
    onChange({
      target: {
        name: name || '',
        value: optionValue,
      }
    } as React.ChangeEvent<HTMLSelectElement>);
    
    setIsOpen(false);
  };

  // Don't render until we have options
  if (!hasReceivedOptions && options.length === 0) {
    return null;
  }

  // Show placeholder if no options after receiving some
  if (hasReceivedOptions && currentOptions.length === 0) {
    return (
      <div className={`w-full text-sm text-gray-500 ${className}`}>
        No options available
      </div>
    );
  }

  const renderDropdownContent = () => {
    if (!isOpen || !portalContainer) return null;
    
    return ReactDOM.createPortal(
      <div 
        ref={dropdownRef}
        style={{
          position: 'absolute',
          top: `${dropdownPosition.top + 8}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          zIndex: 9999,
          backgroundColor: 'var(--app-bg-primary)',
          color: 'var(--app-text-primary)',
          borderRadius: '0.375rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          outline: 'none',
          border: '1px solid var(--app-border-primary)'
        }}
        className="max-h-60 overflow-auto scrollbar-visible"
      >
        {currentOptions.map((option) => (
          <button
            key={option.value}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(option.value);
            }}
            className={cn(
              "w-full px-3 py-2 text-sm flex items-center",
              "hover:bg-[var(--app-bg-tertiary)]",
              option.value === value ? "bg-[var(--app-active-bg)]" : ""
            )}
          >
            {option.value === value ? (
              <Check 
                className="h-4 w-4 mr-2 flex-shrink-0" 
                color="var(--app-text-muted)"
              />
            ) : (
              <div className="w-4 h-4 mr-2 flex-shrink-0" />
            )}
            <span className="flex-grow text-left">{option.label}</span>
          </button>
        ))}
      </div>,
      portalContainer
    );
  };

  return (
    <div className={cn("relative inline-block w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="w-full h-full px-3 flex justify-between items-center bg-[#2f3e46] text-[#84a98c]"
        onClick={toggleDropdown}
        disabled={disabled}
      >
        <div className="flex-grow text-right mr-2 text-sm">
          {selectedOption ? selectedOption.label : "Select..."}
        </div>
        <div 
          className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <div 
            className="w-2 h-2 border-r-2 border-b-2 border-[#84a98c] transform rotate-45"
          ></div>
        </div>
      </button>
      {renderDropdownContent()}
    </div>
  );
};

export { CustomDropdown, SearchBarCustomDropdown }; 