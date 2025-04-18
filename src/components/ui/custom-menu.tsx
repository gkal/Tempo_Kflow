import React, { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface MenuProps {
  trigger: React.ReactNode;
  align?: 'start' | 'end';
  children: React.ReactNode;
}

interface MenuItemProps {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export function CustomMenu({ trigger, align = 'end', children }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 mt-2 bg-[#2f3e46] rounded-md overflow-hidden",
            "min-w-[12rem] border border-[#52796f]",
            align === 'end' ? 'right-0' : 'left-0'
          )}
        >
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomMenuItem({ onClick, className, children }: MenuItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-[#52796f]/20 text-[#cad2c5]",
        className
      )}
    >
      {children}
    </div>
  );
} 
