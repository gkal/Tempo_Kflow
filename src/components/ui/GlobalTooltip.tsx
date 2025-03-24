import React, { ReactNode, useMemo, useRef, useEffect } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import "../../styles/tooltip.css";

type TooltipPosition = "top" | "right" | "bottom" | "left";

/**
 * Props for the GlobalTooltip component
 * @typedef {Object} GlobalTooltipProps
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
  /** ID for accessibility purposes */
  id?: string;
}

/**
 * Calculate class names based on the tooltip position
 * 
 * @param position - The tooltip position
 * @returns The CSS class for the given position
 */
const getPositionClass = (position: TooltipPosition): string => {
  switch (position) {
    case "top": return "tooltip-top";
    case "right": return "tooltip-right";
    case "bottom": return "tooltip-bottom";
    case "left": return "tooltip-left";
    default: return "tooltip-top";
  }
};

/**
 * GlobalTooltip - A standardized tooltip component for use throughout the application
 * 
 * This component implements a custom tooltip that is styled consistently across
 * the application. It does not rely on a library like Radix UI, making it
 * more lightweight and customizable.
 * 
 * @param content - The content to display in the tooltip
 * @param children - The element that triggers the tooltip
 * @param maxWidth - Maximum width for the tooltip in pixels (default: 800)
 * @param position - The position of the tooltip (default: "top")
 * @param className - Additional CSS classes for the tooltip content
 * @param disabled - Whether the tooltip is disabled
 * @param id - ID for accessibility purposes
 * 
 * @returns {JSX.Element} - The tooltip component
 * 
 * @example
 * // Basic usage
 * <GlobalTooltip content="More info about this feature">
 *   <InfoIcon />
 * </GlobalTooltip>
 * 
 * // Positioned to the right
 * <GlobalTooltip content="Click to expand" position="right">
 *   <ExpandButton />
 * </GlobalTooltip>
 * 
 * @usedIn
 * - src/components/ui/truncated-text.tsx
 * - src/components/customers/offer-dialog/DetailsTab.tsx
 */
export function GlobalTooltip({
  content,
  children,
  maxWidth = 800,
  position = "top",
  className = "",
  disabled = false,
  id,
}: GlobalTooltipProps) {
  // Don't render tooltip if disabled
  if (disabled) return <>{children}</>;

  const tooltipClass = getPositionClass(position);
  const tooltipId = id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div 
      className="tooltip-wrapper"
      role="tooltip" 
      aria-describedby={tooltipId}
    >
      {children}
      <div 
        id={tooltipId}
        className={cn("tooltip-content", tooltipClass, className)}
        style={{ maxWidth: `${maxWidth}px` }}
        aria-hidden={false}
      >
        {content}
      </div>
    </div>
  );
}

/**
 * Props for the TruncateWithTooltip component
 * @typedef {Object} TruncateWithTooltipProps
 */
interface TruncateWithTooltipProps {
  /** Text to truncate */
  text: string;
  /** Maximum length before truncation */
  maxLength?: number;
  /** Maximum width for the tooltip */
  maxWidth?: number;
  /** Position of the tooltip */
  position?: TooltipPosition;
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
 * 
 * @param maxLines - Maximum number of lines to display
 * @returns CSS styles object for multi-line truncation
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
 * 
 * This component truncates text that exceeds a specified length and shows
 * the full text in a tooltip when hovered. It supports both single-line and
 * multi-line truncation.
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 40)
 * @param maxWidth - Maximum width for the tooltip (default: 800)
 * @param position - Tooltip position (default: "top")
 * @param className - Additional CSS classes
 * @param multiLine - Whether to allow multiple lines (default: false)
 * @param maxLines - Maximum number of lines when multiLine is true (default: 2)
 * @param disabled - Whether the tooltip is disabled
 * 
 * @returns {JSX.Element} - The truncated text with tooltip
 * 
 * @example
 * // Single-line truncation
 * <TruncateWithTooltip 
 *   text="This is a very long text that will be truncated" 
 *   maxLength={20} 
 * />
 * 
 * // Multi-line truncation
 * <TruncateWithTooltip 
 *   text="This is a very long text that will be truncated over multiple lines" 
 *   multiLine={true}
 *   maxLines={2}
 * />
 * 
 * @usedIn
 * - src/components/customers/offer-dialog/DetailsTab.tsx
 */
export function TruncateWithTooltip({
  text,
  maxLength = 40,
  maxWidth = 800,
  position = "top",
  className = "",
  multiLine = false,
  maxLines = 2,
  disabled = false
}: TruncateWithTooltipProps) {
  // Return a dash if text is empty
  if (!text) return <span className={className}>-</span>;
  
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
        content={text} 
        maxWidth={maxWidth} 
        position={position}
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
      maxWidth={maxWidth} 
      position={position}
      disabled={disabled || !needsTruncation}
    >
      <span className={cn("whitespace-nowrap", className)}>
        {text.substring(0, maxLength)}
        <span className="ml-1 ellipsis-blue">...</span>
      </span>
    </GlobalTooltip>
  );
}

// =============================================================================
// Radix UI Tooltip Components - Below components are from tooltip.tsx
// =============================================================================

/**
 * Tooltip provider component from Radix UI
 */
export const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Tooltip root component from Radix UI
 */
export const Tooltip = TooltipPrimitive.Root;

/**
 * Tooltip trigger component from Radix UI
 */
export const TooltipTrigger = TooltipPrimitive.Trigger;

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
 * 
 * This hook determines whether a tooltip should be visible based on form validation logic.
 * Primarily used for showing validation tooltips on form fields.
 * 
 * @param props - The tooltip hook props
 * @returns Object containing isVisible flag
 * 
 * @example
 * const { isVisible } = useTooltip({ 
 *   showTooltip: isValidating, 
 *   value: fieldValue 
 * });
 * 
 * @deprecated Use form validation components instead
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

/**
 * Tooltip content component from Radix UI with styling
 */
export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-[9999] overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

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
 * 
 * This component provides a tooltip using Radix UI's tooltip primitives.
 * It's useful when you need more advanced tooltip features like animations,
 * arrow indicators, or controlled state.
 * 
 * @param children - Element that triggers the tooltip
 * @param content - Content to display in the tooltip
 * @param className - CSS class for the tooltip
 * @param disabled - Whether the tooltip is disabled
 * 
 * @returns {JSX.Element} The tooltip component
 * 
 * @example
 * <RadixTooltip content="Click to save">
 *   <SaveButton />
 * </RadixTooltip>
 * 
 * @usedIn Validation tooltips in form components
 */
export function RadixTooltip({ 
  children, 
  content,
  className = "",
  disabled = false
}: RadixTooltipProps) {
  if (disabled) return <>{children}</>;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{children}</span>
        </TooltipTrigger>
        <TooltipContent className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Backwards compatibility exports
export const SimpleTooltip = RadixTooltip; 