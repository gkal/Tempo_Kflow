import React from 'react';
import { cn } from '@/lib/utils';

interface TableWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function TableWrapper({
  title,
  subtitle,
  description,
  className,
  children,
  ...props
}: TableWrapperProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Only show header if title or description exists */}
      {(title || description) && (
        <div className="flex flex-col space-y-1.5">
          {title && (
            <div className="flex items-center">
              <h3 className="text-lg font-semibold leading-none tracking-tight text-[#cad2c5]">
                {title}
              </h3>
              {subtitle && (
                <p className="ml-2 text-[#cad2c5]/70 text-sm">{subtitle}</p>
              )}
            </div>
          )}
          {description && (
            <p className="text-sm text-[#cad2c5]/70">{description}</p>
          )}
        </div>
      )}

      {/* Main content wrapper */}
      <div className="rounded-md border border-[#52796f] overflow-hidden">
        {/* Table component passed via children */}
        {children}
      </div>
    </div>
  );
}

export default TableWrapper; 