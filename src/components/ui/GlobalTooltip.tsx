import React, { ReactNode, useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { createPortal } from "react-dom";

// Update position types to focus on vertical positioning
type TooltipPosition = "top" | "bottom";

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
  /** Delay before showing tooltip in milliseconds */
  delay?: number;
}

/**
 * Formats tooltip content based on length
 * - Short content (<150 chars) stays on one line
 * - Longer content wraps to multiple lines
 */
const formatTooltipContent = (content: ReactNode): ReactNode => {
  if (typeof content !== 'string' || content.length <= 150) {
    return <div className="whitespace-nowrap overflow-hidden text-ellipsis">{content}</div>;
  }
  
  return <div className="whitespace-normal overflow-hidden break-words">{content}</div>;
};

/**
 * GlobalTooltip - A simplified tooltip component
 * Now positions above/below the element to avoid covering adjacent content
 */
export function GlobalTooltip({
  content,
  children,
  maxWidth = 800,
  position = "top", // Default to top position
  className = "",
  disabled = false,
  delay = 250,
}: GlobalTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Add effect to handle delay and position calculation
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (isHovered) {
      // Set timer to show tooltip after delay
      timerRef.current = setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          
          // Calculate horizontal center position
          const centerX = rect.left + window.scrollX + rect.width / 2;
          
          if (position === "top") {
            // Position above the element
            setTooltipPosition({
              top: rect.top + window.scrollY - 10, // 10px gap above
              left: centerX,
            });
          } else {
            // Position below the element
            setTooltipPosition({
              top: rect.bottom + window.scrollY + 10, // 10px gap below
              left: centerX,
            });
          }
        }
        setIsVisible(true);
      }, delay);
    } else {
      // Hide immediately when not hovered
      setIsVisible(false);
    }
    
    // Cleanup timer on unmount or hover change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isHovered, delay, position]);
  
  // Don't render tooltip if disabled
  if (disabled) return <>{children}</>;
  
  // Format content based on length
  const formattedContent = formatTooltipContent(content);
  
  // Arrow styling based on position
  const arrowStyle = position === "top" 
    ? "bottom-[-8px] left-1/2 -translate-x-1/2 border-[8px] border-t-[#2d4f5c] border-l-[transparent] border-r-[transparent] border-b-[transparent]" 
    : "top-[-8px] left-1/2 -translate-x-1/2 border-[8px] border-b-[#2d4f5c] border-l-[transparent] border-r-[transparent] border-t-[transparent]";
  
  // Transform based on position
  const transformStyle = position === "top" 
    ? "translate(-50%, -100%)" 
    : "translate(-50%, 0)";
  
  return (
    <>
      <div 
        ref={containerRef}
        className="inline-block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
      >
        {children}
      </div>
      
      {isVisible && typeof document !== 'undefined' && createPortal(
        <>
          <div 
            className={cn(
              "fixed z-[9999] rounded-md bg-[#1a2e35] px-3 py-1.5 text-xs text-[#cad2c5] border border-[#52796f] shadow-lg",
              "min-w-[120px] max-w-[600px] transition-opacity duration-200 overflow-hidden",
              className
            )}
            style={{ 
              maxWidth: `${maxWidth}px`,
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: transformStyle,
              wordBreak: "break-word",
              overflowWrap: "break-word"
            }}
          >
            {formattedContent}
          </div>
          <div 
            className={`fixed z-[9999] ${arrowStyle}`} 
            style={{
              top: position === "top" ? `${tooltipPosition.top}px` : `${tooltipPosition.top - 8}px`,
              left: `${tooltipPosition.left}px`
            }}
          />
        </>,
        document.body
      )}
    </>
  );
}

/**
 * SafeTooltip - A tooltip component with extra safety for mounting/unmounting
 */
export function SafeTooltip({
  children,
  content,
  maxWidth = 800,
  position = "top", // Default to top position
  className = "",
  disabled = false,
  delay = 250,
}: GlobalTooltipProps) {
  return (
    <GlobalTooltip
      content={content}
      maxWidth={maxWidth}
      position={position}
      className={className}
      disabled={disabled}
      delay={delay}
    >
      {children}
    </GlobalTooltip>
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
  /** Delay before showing tooltip in milliseconds */
  delay?: number;
}

/**
 * TruncateWithTooltip - A component that truncates text and shows full text in tooltip
 */
export function TruncateWithTooltip({
  text,
  maxLength = 30,
  tooltipMaxWidth,
  maxWidth,
  position,
  tooltipPosition,
  className = "",
  multiLine = false,
  maxLines = 2,
  disabled = false,
  delay = 250,
}: TruncateWithTooltipProps) {
  // Use the newer prop names, but fall back to legacy props if needed
  const finalMaxWidth = tooltipMaxWidth || maxWidth || 800;
  const finalPosition = position || tooltipPosition || "top";
  
  // Check if text needs truncation
  const needsTruncation = multiLine 
    ? false // We can't easily detect if multi-line text is truncated without rendering
    : text.length > maxLength;
  
  // Don't use tooltip if disabled or no truncation needed (for single line)
  if (disabled || (!needsTruncation && !multiLine)) {
    return <span className={className}>{text}</span>;
  }
  
  // Apply different styles based on single/multi-line truncation
  if (multiLine) {
    return (
      <GlobalTooltip 
        content={text} 
        position={finalPosition}
        maxWidth={finalMaxWidth}
        disabled={disabled}
        delay={delay}
      >
        <span 
          className={cn("cursor-pointer line-clamp-2 overflow-hidden text-ellipsis", className)}
          style={maxLines > 2 ? {
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          } : undefined}
        >
          {text}
        </span>
      </GlobalTooltip>
    );
  }
  
  // Single line truncation with ellipsis
  return (
    <GlobalTooltip 
      content={text} 
      position={finalPosition}
      maxWidth={finalMaxWidth}
      disabled={disabled}
      delay={delay}
    >
      <span className={cn("cursor-pointer truncate inline-block", className)}>
        {text.length > maxLength 
          ? `${text.substring(0, maxLength)}...` 
          : text
        }
      </span>
    </GlobalTooltip>
  );
}

/**
 * Dedicated CSS that will be injected into the document head to ensure our blue dots render correctly
 * This completely bypasses React's styling system
 */
const injectGlobalCSS = () => {
  if (typeof document !== 'undefined' && !document.getElementById('blue-dots-css')) {
    const style = document.createElement('style');
    style.id = 'blue-dots-css';
    style.innerHTML = `
      .blue-emoji-dots {
        color: #3B82F6 !important;
        fill: #3B82F6 !important;
        font-size: 20px !important;
        font-weight: bold !important;
        background: transparent !important;
        text-shadow: 0 0 0 #3B82F6 !important;
        -webkit-text-fill-color: #3B82F6 !important;
        display: inline-block !important;
        line-height: 1 !important;
        font-family: "Segoe UI Emoji", "Apple Color Emoji", sans-serif !important;
      }
    `;
    document.head.appendChild(style);
  }
};

/**
 * BlueImage - Uses an actual image file instead of trying to style text/elements
 */
const BlueImage = memo(() => {
  const imgUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAABYUlEQVQ4jbWUv0oDQRDGf3crChYW1xgQFEUELRS1sBMbbfQNfAJfQAvfwEoQX0AQsbFQEJIiiIWgEY0pjImQxEQh/rlzLYxwXO5yJpoPFm535tuP2Z3bVZKK1CElWcAsMA+MAyNAP5ABnoE7YBc4A25j+AshRSXpVNKbii2T9JWyXUmrkkqxgsAGcAWMxYjsBDAJnADTMc5lSQ9KtpLIL5L0HKheSBoOODYkfSry1hP5NUmfQWBN4OJM0s2xpF81aM18wQmwG6LuJ/D+m94JrAGHQD2lmL2nZQ/YvbMFlvGJV3OGE67LntlxegM4UVp7sY8dwH8qc4aXwHUGKPsfGwfmUoKFDNFjeqhVgStgQDXRCqD3qnDGZPM9TzJAPUQoH5ixn/rPTjEP1AAzQCEEqAHTwDxIKseYl/hKWXe3xYhAGTgHBhPEhuxxLwJ1g9+lbfwXegP2gCPgIU5gB/84fwAO01gu99TxnQAAAABJRU5ErkJggg==";
  
  return (
    <img 
      src={imgUrl}
      alt="Blue dots"
      width="20"
      height="20"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
});
BlueImage.displayName = 'BlueImage';

/**
 * INFO TRIGGER - MOST EXTREME VERSION POSSIBLE FOR VISIBILITY TESTING
 * Bright red box with neon green text to ensure visibility
 */
const InfoTrigger = memo(() => {
  return (
    <div 
      id="TEST-VISIBILITY-TRIGGER"
      style={{ 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        backgroundColor: '#ff0000', /* Bright red */
        color: '#00ff00', /* Neon green */
        fontWeight: 'bold',
        borderRadius: '4px',
        fontSize: '14px',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        margin: '0 4px',
        border: '2px solid black',
      }}
    >
      !
    </div>
  );
});
InfoTrigger.displayName = 'InfoTrigger';

/**
 * EllipsisWithTooltip - Shows a tooltip
 * COMPLETELY CHANGED: Now uses a red box with neon green text for maximum visibility
 */
export function EllipsisWithTooltip({
  content,
  maxWidth = 800,
  position = "top",
  className = "",
  disabled = false,
  delay = 250,
}: Omit<GlobalTooltipProps, 'children'>) {
  if (disabled) {
    return <InfoTrigger />;
  }
  
  console.log("RENDERING UPDATED ELLIPSIS WITH TOOLTIP"); // Debug log
  
  return (
    <GlobalTooltip
      content={content}
      position={position}
      maxWidth={maxWidth}
      className={className}
      delay={delay}
    >
      <InfoTrigger />
    </GlobalTooltip>
  );
}

// Re-export Radix UI tooltip primitives for backward compatibility
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = TooltipPrimitive.Content;
export const TooltipPortal = TooltipPrimitive.Portal;
export const TooltipArrow = TooltipPrimitive.Arrow; 