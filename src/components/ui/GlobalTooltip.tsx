import React, { ReactNode } from "react";
import "../../styles/tooltip.css";

interface GlobalTooltipProps {
  content: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  position?: "top" | "right";
  className?: string;
}

/**
 * GlobalTooltip - A standardized tooltip component for use throughout the application
 * 
 * @param {ReactNode} content - The content to display in the tooltip
 * @param {ReactNode} children - The element that triggers the tooltip
 * @param {number} maxWidth - Maximum width for the tooltip in pixels (default: 800)
 * @param {string} position - The position of the tooltip ("top" or "right", default: "top")
 * @param {string} className - Additional CSS classes for the tooltip content
 * 
 * @returns {JSX.Element} - The tooltip component
 */
export function GlobalTooltip({
  content,
  children,
  maxWidth = 800,
  position = "top",
  className = ""
}: GlobalTooltipProps) {
  const tooltipClass = position === "top" ? "tooltip-top" : "tooltip-right";
  
  return (
    <div className="tooltip-wrapper">
      {children}
      <div 
        className={`tooltip-content ${tooltipClass} ${className}`}
        style={{ maxWidth: `${maxWidth}px` }}
      >
        {content}
      </div>
    </div>
  );
}

/**
 * TruncateWithTooltip - A helper component for truncating text and showing a tooltip
 * 
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation (default: 40)
 * @param {number} maxWidth - Maximum width for the tooltip (default: 800)
 * @param {string} position - Tooltip position ("top" or "right", default: "top")
 * @param {string} className - Additional CSS classes
 * @param {boolean} multiLine - Whether to allow multiple lines (default: false)
 * @param {number} maxLines - Maximum number of lines when multiLine is true (default: 2)
 * 
 * @returns {JSX.Element} - The truncated text with tooltip
 */
export function TruncateWithTooltip({
  text,
  maxLength = 40,
  maxWidth = 800,
  position = "top",
  className = "",
  multiLine = false,
  maxLines = 2
}: {
  text: string;
  maxLength?: number;
  maxWidth?: number;
  position?: "top" | "right";
  className?: string;
  multiLine?: boolean;
  maxLines?: number;
}) {
  if (!text) return <span className={className}>-</span>;
  
  // If text is shorter than maxLength, just return it
  if (text.length <= maxLength && !multiLine) {
    return <span className={className}>{text}</span>;
  }
  
  // For multi-line mode
  if (multiLine) {
    return (
      <GlobalTooltip content={text} maxWidth={maxWidth} position={position}>
        <div 
          className={`${className}`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%'
          }}
        >
          {text}
          <span className="ml-1 ellipsis-blue">...</span>
        </div>
      </GlobalTooltip>
    );
  }
  
  // For single-line mode
  return (
    <GlobalTooltip content={text} maxWidth={maxWidth} position={position}>
      <span className={`whitespace-nowrap ${className}`}>
        {text.substring(0, maxLength)}
        <span className="ml-1 ellipsis-blue">...</span>
      </span>
    </GlobalTooltip>
  );
} 