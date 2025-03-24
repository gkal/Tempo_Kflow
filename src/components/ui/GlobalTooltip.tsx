import React, { ReactNode, useMemo, useRef, useEffect } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import "../../styles/tooltip.css";

type TooltipPosition = "top" | "right" | "bottom" | "left";

/**
 * Props for the GlobalTooltip component
 */
interface GlobalTooltipProps {
  /** Content to display in the tooltip */
  content: ReactNode;
  /** Element that triggers the tooltip */
  children: ReactNode;
  /** Maximum width for the tooltip in pixels */
  maxWidth?: number;
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Additional CSS classes for the tooltip */
  className?: string;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
}

/**
 * GlobalTooltip - A standardized tooltip component
 */
export function GlobalTooltip({
  content,
  children,
  maxWidth = 800,
  position = "top",
  className = "",
  disabled = false,
}: GlobalTooltipProps) {
  // Don't render tooltip if disabled
  if (disabled) return <>{children}</>;
  
  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={document.body}>
          <TooltipPrimitive.Content 
            className={cn(
              "z-[9999] overflow-hidden rounded-md bg-[#2f3e46] px-3 py-1.5 text-xs text-[#cad2c5] border border-[#52796f] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              className
            )}
            style={{ 
              maxWidth: `${maxWidth}px`,
              borderWidth: "1px", // Ensure only 1px border
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)" // Add shadow for depth
            }}
            sideOffset={1}
            side={position}
            forceMount={false}
          >
            {content}
            <TooltipPrimitive.Arrow width={12} height={6} className="fill-[#52796f]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/**
 * Props for the TruncateWithTooltip component
 */
interface TruncateWithTooltipProps {
  /** Text to truncate */
  text: string;
  /** Maximum length before truncation */
  maxLength?: number;
  /** Maximum width for the tooltip */
  tooltipMaxWidth?: number;
  /** Maximum width for the tooltip (legacy prop) */
  maxWidth?: number;
  /** Position of the tooltip */
  position?: TooltipPosition;
  /** Position of the tooltip (legacy prop) */
  tooltipPosition?: TooltipPosition;
  /** Additional CSS classes */
  className?: string;
  /** Whether to allow multiple lines */
  multiLine?: boolean;
  /** Maximum number of lines when multiLine is true */
  maxLines?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
}

/**
 * Generate styles for multiline truncation
 */
const getMultiLineStyles = (maxLines: number) => ({
  display: '-webkit-box' as const,
  WebkitLineClamp: maxLines,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%'
});

/**
 * TruncateWithTooltip - A helper component for truncating text and showing a tooltip
 */
export function TruncateWithTooltip({
  text,
  maxLength = 40,
  maxWidth,
  tooltipMaxWidth = 800,
  position = "top",
  tooltipPosition,
  className = "",
  multiLine = false,
  maxLines = 2,
  disabled = false
}: TruncateWithTooltipProps) {
  // Return a dash if text is empty
  if (!text) return <span className={className}>-</span>;
  
  // Use maxWidth as fallback for tooltipMaxWidth and tooltipPosition as fallback for position
  const finalMaxWidth = maxWidth || tooltipMaxWidth;
  const finalPosition = tooltipPosition || position;
  
  // Determine if truncation is needed
  const needsTruncation = useMemo(() => {
    if (multiLine) return text.length > maxLength * 2; // Approximate for multiline
    return text.length > maxLength;
  }, [text, maxLength, multiLine]);
  
  // If text is shorter than maxLength and not multiline, just return it
  if (!needsTruncation && !multiLine) {
    return <span className={className}>{text}</span>;
  }
  
  // If tooltip is disabled but text needs truncation, show truncated text without tooltip
  if (disabled && needsTruncation) {
    if (multiLine) {
      return (
        <div 
          className={className}
          style={getMultiLineStyles(maxLines)}
        >
          {text}
          <span className="ml-1 ellipsis-blue">...</span>
        </div>
      );
    }
    
    return (
      <span className={cn("whitespace-nowrap", className)}>
        {text.substring(0, maxLength)}
        <span className="ml-1 ellipsis-blue">...</span>
      </span>
    );
  }
  
  // For multi-line mode with tooltip
  if (multiLine) {
    return (
      <GlobalTooltip 
        content={<div className="whitespace-pre-wrap max-w-full">{text}</div>}
        maxWidth={finalMaxWidth}
        position={finalPosition}
        disabled={disabled || !needsTruncation}
      >
        <div 
          className={className}
          style={getMultiLineStyles(maxLines)}
        >
          {text}
          {needsTruncation && <span className="ml-1 ellipsis-blue">...</span>}
        </div>
      </GlobalTooltip>
    );
  }
  
  // For single-line mode with tooltip
  return (
    <GlobalTooltip 
      content={text}
      maxWidth={finalMaxWidth}
      position={finalPosition}
      disabled={disabled || !needsTruncation}
    >
      <span className={cn("whitespace-nowrap", className)}>
        {text.substring(0, maxLength)}
        <span className="ml-1 ellipsis-blue">...</span>
      </span>
    </GlobalTooltip>
  );
}

// Export primitive components for backwards compatibility
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = TooltipPrimitive.Content;
export const TooltipPortal = TooltipPrimitive.Portal;
export const TooltipArrow = TooltipPrimitive.Arrow;

/**
 * Props for the RadixTooltip component
 */
interface RadixTooltipProps {
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Content to display in the tooltip */
  content: React.ReactNode;
  /** CSS class for the tooltip */
  className?: string;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
}

/**
 * RadixTooltip - A tooltip component based on Radix UI
 */
export function RadixTooltip({ 
  children, 
  content,
  className = "",
  disabled = false
}: RadixTooltipProps) {
  if (disabled) return <>{children}</>;
  
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span>{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className={className}>
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// Backwards compatibility exports
export const SimpleTooltip = RadixTooltip;

/**
 * Props for the useTooltip hook
 */
interface UseTooltipProps {
  /** Whether the tooltip should be shown (for validation tooltips) */
  showTooltip?: boolean;
  /** Value to check against for validation tooltips */
  value?: string;
  /** Whether to update on every value change or only on complete changes */
  updateOnEveryChange?: boolean;
}

/**
 * Hook for tooltip visibility logic
 */
export const useTooltip = ({ 
  showTooltip = false, 
  value = "",
  updateOnEveryChange = false
}: UseTooltipProps = {}) => {
  // Use a ref to track if the tooltip should be shown
  const shouldShowRef = useRef(showTooltip && value.trim() === "");
  
  // Only update the ref when the component mounts or when value changes completely (not during typing)
  useEffect(() => {
    // When to update the ref based on updateOnEveryChange flag
    const shouldUpdate = updateOnEveryChange || value.trim() === "" || value.trim().length > 3;
    
    if (shouldUpdate) {
      shouldShowRef.current = showTooltip && value.trim() === "";
    }
  }, [showTooltip, value, updateOnEveryChange]);
  
  return useMemo(() => ({
    isVisible: shouldShowRef.current
  }), [shouldShowRef.current]);
}; 