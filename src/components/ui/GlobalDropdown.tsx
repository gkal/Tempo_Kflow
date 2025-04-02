import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { ChevronDown, Edit } from "lucide-react";
import "../ui/dropdown.css";

interface GlobalDropdownProps {
  options: (string | { id: string; name: string })[];
  onSelect: (option: string) => void;
  onEdit?: (option: string | { id: string; name: string }) => void;
  placeholder?: string;
  value?: string;
  header?: string;
  className?: string;
  disabled?: boolean;
  renderOption?: (option: string | { id: string; name: string }) => React.ReactNode;
  renderValue?: (value: string) => React.ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
  showEditButton?: boolean;
  formContext?: boolean;
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
  renderValue,
  onContextMenu,
  showEditButton = false,
  formContext = false,
}: GlobalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(value);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setSelectedOption(value);
  }, [value]);

  // Reset state when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setHoveredItem(null);
    }
  }, [isOpen]);

  const findSelectedOption = () => {
    return options.find(opt => 
      typeof opt === 'string' 
        ? opt === value 
        : opt.id === value || opt.name === value
    );
  };

  const getDisplayValue = () => {
    const selectedOpt = findSelectedOption();
    if (!selectedOpt) return placeholder;
    return typeof selectedOpt === 'string' ? selectedOpt : selectedOpt.name;
  };

  const handleEdit = (option: string | { id: string; name: string }) => {
    if (onEdit) {
      onEdit(option);
    }
  };

  const renderDefaultOption = (option: string | { id: string; name: string }) => {
    if (!option) return placeholder;
    return typeof option === 'string' ? option : option.name;
  };

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const scrollX = window.scrollX || document.documentElement.scrollLeft;
          
          setDropdownPosition({
            top: rect.bottom + scrollY,
            left: rect.left + scrollX,
            width: rect.width
          });
        }
      };

      // Handle scroll and resize events to reposition dropdown
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);
  
  // Handle closing the dropdown when it's no longer open
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setShouldRender(false);
        setIsPositioned(false);
      }, 150); // Small delay to allow for animation
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

  const handleOptionClick = (option: string | { id: string; name: string }) => {
    const optionValue = typeof option === 'string' ? option : option.id;
    setSelectedOption(optionValue);
    onSelect(optionValue);
    setIsOpen(false);
  };

  const renderOptionContent = (option: string | { id: string; name: string }) => {
    if (renderOption) {
      return renderOption(option);
    }
    return renderDefaultOption(option);
  };

  const renderSelectedValue = () => {
    if (!value) return placeholder;
    if (renderValue) return renderValue(value);
    const selectedItem = findSelectedOption();
    if (!selectedItem) return placeholder;
    if (renderOption) return renderOption(selectedItem);
    return renderDefaultOption(selectedItem);
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
    if (!shouldRender && !isOpen) return null;

    const menuStyle: React.CSSProperties = {
      top: `${dropdownPosition.top}px`,
      left: `${dropdownPosition.left}px`,
      width: `${dropdownPosition.width}px`,
      opacity: isOpen ? 1 : 0,
      transform: isOpen ? 'translateY(0)' : 'translateY(-8px)',
      transition: 'opacity 150ms ease-in-out, transform 150ms ease-in-out',
      pointerEvents: isOpen ? 'auto' : 'none'
    };

    return ReactDOM.createPortal(
      <div 
        className="dropdown-menu fixed bg-[#2f3e46] border border-[#52796f] rounded-md shadow-lg overflow-y-auto max-h-48 z-[100]"
        style={menuStyle}
        onWheel={handleWheel}
      >
        <div id="dropdown-menu-title" className="sr-only">Options Menu</div>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.id;
          const isSelected = optionValue === selectedOption;
          
          return (
            <div
              key={optionValue}
              className={`dropdown-item ${isSelected ? 'selected-item' : ''} ${
                hoveredItem === optionValue ? 'hovered' : ''
              } relative group`}
              onMouseEnter={() => setHoveredItem(optionValue)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleOptionClick(option);
              }}
            >
              <div className="flex justify-between items-center w-full pr-2">
                <span>{renderOptionContent(option)}</span>
                {hoveredItem === optionValue && typeof option !== 'string' && showEditButton && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(option);
                      setIsOpen(false);
                    }}
                    className="text-[#84a98c] hover:text-[#52796f] transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>,
      document.body
    );
  };

  const toggleDropdown = () => {
    if (disabled) return;
    
    if (!isOpen) {
      // Calculate position before opening
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        
        setDropdownPosition({
          top: rect.bottom + scrollY,
          left: rect.left + scrollX,
          width: rect.width
        });
        
        // Set positioned first, then open the dropdown in the next tick
        setIsPositioned(true);
        setTimeout(() => {
          setShouldRender(true);
          setIsOpen(true);
        }, 0);
      } else {
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
      setTimeout(() => {
        setShouldRender(false);
      }, 150); // Small delay to allow for animation
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ zIndex: isOpen ? 50 : 'auto' }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md border ${
          formContext 
            ? 'border-[#52796f]' 
            : 'bg-[#2f3e46] border-[#52796f] hover:bg-[#2f3e46] focus:bg-[#2f3e46]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        style={{ 
          backgroundColor: formContext ? '#3a5258' : undefined,
          borderRadius: '0.375rem'
        }}
        onClick={toggleDropdown}
        disabled={disabled}
        onContextMenu={onContextMenu}
      >
        <span className="truncate">
          {renderSelectedValue()}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {(isOpen || shouldRender) && renderDropdownMenu()}
    </div>
  );
} 