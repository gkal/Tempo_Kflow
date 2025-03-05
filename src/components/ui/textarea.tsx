import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, style, onMouseOver, onMouseOut, ...props }, ref) => {
    // Only apply default styles if not a customer-notes-textarea
    const isCustomerNotesTextarea = className?.includes('customer-notes-textarea');
    
    // Merge the default style with any provided style
    const mergedStyle = isCustomerNotesTextarea 
      ? { ...style }
      : {
          minHeight: '124px',
          height: '124px',
          maxHeight: '124px',
          resize: 'none' as const,
          border: 'none',
          ...style
        };

    // Custom hover handlers
    const handleMouseOver = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      e.currentTarget.style.boxShadow = '0 0 0 1px #52796f';
      onMouseOver?.(e);
    };

    const handleMouseOut = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (document.activeElement !== e.currentTarget) {
        e.currentTarget.style.boxShadow = 'none';
      }
      onMouseOut?.(e);
    };

    return (
      <textarea
        className={cn(
          "flex w-full rounded-md bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={mergedStyle}
        ref={ref}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
