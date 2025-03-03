import React, { useState, useEffect, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className = "", 
  placeholder = "Select..." 
}) => {
  const selectedOption = options.find(option => option.value === selectedValue);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Menu as="div" className={cn("relative w-full", className)}>
      {({ open }) => (
        <>
          <Menu.Button
            ref={buttonRef}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-[#cad2c5] bg-[#2f3e46] border border-[#52796f] rounded-md hover:bg-[#354f52] focus:outline-none"
          >
            <span className="truncate text-left flex-1">
              {selectedOption?.label || placeholder}
            </span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-[#84a98c] transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </Menu.Button>

          <Transition
            show={open}
            as={React.Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              static
              className="absolute z-[60] w-full mt-1 bg-[#2f3e46] border border-[#52796f] rounded-md shadow-lg max-h-60 overflow-auto focus:outline-none"
            >
              <div className="py-1">
                {options.map((option) => (
                  <Menu.Item key={option.value}>
                    {({ active }) => (
                      <button
                        onClick={() => onChange(option.value)}
                        className={cn(
                          "w-full flex items-center px-3 py-2 text-sm text-[#cad2c5]",
                          active && "bg-[#354f52]",
                          option.value === selectedValue && "bg-[#52796f]"
                        )}
                      >
                        <span className="w-4 h-4 mr-2 flex-shrink-0">
                          {option.value === selectedValue && (
                            <Check className="h-4 w-4" />
                          )}
                        </span>
                        <span className="text-left flex-1">{option.label}</span>
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default GlobalDropdown; 