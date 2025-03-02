import React, { useRef, useEffect } from 'react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

// Original Tooltip components
const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Our custom Tooltip component
interface CustomTooltipProps {
  children: React.ReactNode;
  showTooltip?: boolean;
  value?: string;
  message?: string;
}

const CustomTooltip = ({ 
  children, 
  showTooltip = false, 
  value = "",
  message = "Υποχρεωτικό πεδίο"
}: CustomTooltipProps) => {
  // Use a ref to track if the tooltip should be shown
  const shouldShowRef = useRef(showTooltip && value.trim() === "");
  
  // Only update the ref when the component mounts or when value changes completely (not during typing)
  useEffect(() => {
    // Only update on mount or when field is cleared or filled completely
    if (value.trim() === "" || value.trim().length > 3) {
      shouldShowRef.current = showTooltip && value.trim() === "";
    }
  }, [showTooltip, value]);
  
  // Don't show tooltip if not required
  if (!showTooltip) return <>{children}</>;
  
  return (
    <div className="tooltip-container">
      {children}
      {shouldShowRef.current && <span className="tooltip">{message}</span>}
    </div>
  );
};

// Export the original components
export { 
  TooltipProvider, 
  TooltipRoot as Tooltip, 
  TooltipTrigger, 
  TooltipContent,
  CustomTooltip
};

// Export our custom tooltip as default
export default CustomTooltip;
