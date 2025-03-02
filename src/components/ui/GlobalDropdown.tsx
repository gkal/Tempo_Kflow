import React, { useState, useEffect, useRef, ReactNode } from "react";
import { Menu } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";

interface GlobalDropdownProps {
  options: { value: string; label: string }[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const GlobalDropdown: React.FC<GlobalDropdownProps> = ({ 
  options = [], 
  selectedValue, 
  onChange, 
  className, 
  placeholder = "Select..." 
}) => {
  const selectedOption = options.find(option => option.value === selectedValue);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [dropdownWidth, setDropdownWidth] = useState(0);

  // Calculate the width of the dropdown based on the longest option text
  useEffect(() => {
    // Create a temporary span to measure text width
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.fontSize = '14px'; // Match the font size of dropdown items
    span.style.fontFamily = 'inherit';
    document.body.appendChild(span);

    // Find the longest option text and its width
    let maxWidth = 0;
    let longestOptionLabel = '';
    options.forEach(option => {
      span.textContent = option.label;
      const width = span.getBoundingClientRect().width;
      if (width > maxWidth) {
        maxWidth = width;
        longestOptionLabel = option.label;
      }
    });

    // Calculations for total width:
    // 1. Longest option text width
    // 2. Checkmark width (24px)
    // 3. Down arrow width (16px)
    // 4. Padding on both sides (32px)
    const checkmarkWidth = 24;
    const downArrowWidth = 16;
    const paddingWidth = 32;
    const totalWidth = maxWidth + checkmarkWidth + downArrowWidth + paddingWidth;

    setDropdownWidth(totalWidth);

    // Clean up
    document.body.removeChild(span);
  }, [options]);

  const updatePosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    
    // Calculate exact position to align with the button
    setMenuPosition({
      top: buttonRect.bottom + 2, // Smaller gap (2px instead of 5px)
      left: buttonRect.left,
      width: buttonRect.width // Match button width exactly
    });
  };

  useEffect(() => {
    if (menuOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [menuOpen, options, dropdownWidth]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Menu as="div" className="w-full">
        {({ open }) => {
          useEffect(() => {
            setMenuOpen(open);
          }, [open]);

          return (
            <>
              <Menu.Button
                ref={buttonRef}
                data-dropdown-button
                className={`text-sm text-[#cad2c5] w-full ${className}`}
                style={{ 
                  padding: '0 1.5rem 0 0.5rem', // Padding to make space for chevron
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end', // Align text to the right
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              >
                <span className="truncate text-right mr-2">{selectedOption?.label || placeholder}</span>
                <ChevronDown 
                  className="h-4 w-4 text-[#52796f] absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    visibility: 'visible',
                    opacity: 1
                  }}
                />
              </Menu.Button>

              {open && createPortal(
                <React.Fragment>
                  <div 
                    className="fixed inset-0 z-[99998]"
                    onClick={() => setMenuOpen(false)}
                  />
                  <Menu.Items
                    static
                    className="fixed z-[99999] bg-[#2f3e46] border border-[#52796f] rounded-md overflow-hidden shadow-lg"
                    style={{
                      top: `${menuPosition.top + 12}px`, // Move dropdown list 12px lower (4px + 8px)
                      left: `${menuPosition.left}px`,
                      width: `${menuPosition.width}px`,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      borderRadius: '4px'
                    }}
                  >
                    {options.map((option, index) => (
                      <Menu.Item key={option.value}>
                        {({ active }) => (
                          <button
                            ref={(el) => itemRefs.current[index] = el}
                            type="button"
                            onClick={() => {
                              onChange(option.value);
                              setMenuOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1 text-sm cursor-pointer flex items-center ${
                              active ? 'bg-[#52796f] text-[#cad2c5]' : 'text-[#cad2c5] hover:bg-[#354f52]'
                            }`}
                            style={{
                              minHeight: '32px', // Increased height to match field size
                              alignItems: 'center'
                            }}
                          >
                            <span className="w-6 h-6 mr-2 flex-shrink-0 flex items-center justify-center">
                              {option.value === selectedValue && (
                                <Check className="h-4 w-4" />
                              )}
                            </span>
                            <span className="truncate flex-grow">{option.label}</span>
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </React.Fragment>,
                document.body
              )}
            </>
          );
        }}
      </Menu>
    </div>
  );
};

export default GlobalDropdown; 