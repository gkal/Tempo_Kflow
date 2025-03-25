import React, { ReactNode, useMemo, useRef, useEffect, useState } from "react";
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
  /** Skip portal to prevent unmounting issues in certain cases */
  skipPortal?: boolean;
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
  skipPortal = false,
}: GlobalTooltipProps) {
  // Don't render tooltip if disabled
  if (disabled) return <>{children}</>;
  
  // Store portal container reference to ensure it exists
  const portalRef = useRef<HTMLElement | null>(null);
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substring(2, 9)}`);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Set up portal reference and mounted state
  useEffect(() => {
    portalRef.current = document.body;
    setIsMounted(true);
    
    return () => {
      // Important: Close tooltip before unmounting
      setIsOpen(false);
      
      // Add a delay before marking component as unmounted to allow animation to complete
      setTimeout(() => {
        setIsMounted(false);
        
        // Find and clean up any orphaned tooltip elements with our ID
        try {
          const tooltipElements = document.querySelectorAll(`[data-tooltip-id="${tooltipId.current}"]`);
          tooltipElements.forEach(el => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 50);
    };
  }, []);
  
  // If portal container isn't ready or component isn't mounted, just render children
  if (!isMounted || (!portalRef.current && !skipPortal)) {
    return <>{children}</>;
  }
  
  try {
    return (
      <TooltipPrimitive.Provider delayDuration={100}>
        <TooltipPrimitive.Root 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
          }}
        >
          <TooltipPrimitive.Trigger asChild>
            {children}
          </TooltipPrimitive.Trigger>
          {skipPortal ? (
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
              forceMount={false as any}
              data-tooltip-id={tooltipId.current}
            >
              {content}
              <TooltipPrimitive.Arrow width={12} height={6} className="fill-[#52796f]" />
            </TooltipPrimitive.Content>
          ) : (
            // Only render portal if tooltip is open to prevent unmounting issues
            isOpen && isMounted && (
              <TooltipPrimitive.Portal container={portalRef.current} data-radix-tooltip-portal>
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
                  forceMount={true}
                  data-tooltip-id={tooltipId.current}
                  onEscapeKeyDown={() => setIsOpen(false)}
                  onPointerDownOutside={() => setIsOpen(false)}
                >
                  {content}
                  <TooltipPrimitive.Arrow width={12} height={6} className="fill-[#52796f]" />
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Portal>
            )
          )}
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    );
  } catch (error) {
    // Fallback in case of rendering error
    console.error("Tooltip rendering error:", error);
    return <>{children}</>;
  }
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
 * SafeTooltip - A wrapper around GlobalTooltip with enhanced error handling
 * This component helps prevent DOM node removal errors by carefully managing portal mounting/unmounting
 */
export function SafeTooltip({
  children,
  content,
  maxWidth = 800,
  position = "top",
  className = "",
  disabled = false
}: GlobalTooltipProps) {
  // State to track if component is about to unmount
  const [isUnmounting, setIsUnmounting] = useState(false);
  
  // Use a ref to track any created portal elements
  const portalRef = useRef<HTMLElement | null>(null);
  const tooltipId = useRef(`safe-tooltip-${Math.random().toString(36).substring(2, 9)}`);
  
  // Effect to clean up tooltip portal elements when unmounting
  useEffect(() => {
    return () => {
      setIsUnmounting(true);
      
      // Use a timeout to ensure cleanup happens after React unmounting
      setTimeout(() => {
        try {
          // Find any tooltip portals with our ID
          const tooltipElements = document.querySelectorAll(`[data-tooltip-id="${tooltipId.current}"]`);
          tooltipElements.forEach(el => {
            if (el && el.parentNode) {
              try {
                el.parentNode.removeChild(el);
              } catch (e) {
                // Ignore removal errors
              }
            }
          });
          
          // Also look for any tooltip portals from Radix
          const radixPortals = document.querySelectorAll('[data-radix-tooltip-content]');
          radixPortals.forEach(portal => {
            try {
              if (portal && portal.parentNode) {
                portal.parentNode.removeChild(portal);
              }
            } catch (e) {
              // Ignore removal errors
            }
          });
        } catch (e) {
          // Ignore any errors during cleanup
        }
      }, 50);
    };
  }, []);
  
  // Don't render tooltip if disabled or currently unmounting
  if (disabled || isUnmounting) {
    return <>{children}</>;
  }
  
  try {
    return (
      <GlobalTooltip
        content={content}
        maxWidth={maxWidth}
        position={position}
        className={className}
        skipPortal={true} // Use skipPortal to avoid portal-related issues
        disabled={disabled || isUnmounting}
      >
        {children}
      </GlobalTooltip>
    );
  } catch (error) {
    // Fallback in case of errors
    console.error("SafeTooltip rendering error:", error);
    return <>{children}</>;
  }
}

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
      <SafeTooltip
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
      </SafeTooltip>
    );
  }
  
  // For single-line mode with tooltip
  return (
    <SafeTooltip
      content={text}
      maxWidth={finalMaxWidth}
      position={finalPosition}
      disabled={disabled || !needsTruncation}
    >
      <span className={cn("whitespace-nowrap", className)}>
        {text.substring(0, maxLength)}
        <span className="ml-1 ellipsis-blue">...</span>
      </span>
    </SafeTooltip>
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