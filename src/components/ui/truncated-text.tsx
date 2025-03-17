import React from "react";
import { GlobalTooltip } from "./GlobalTooltip";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  tooltipPosition?: "top" | "right";
  className?: string;
  tooltipMaxWidth?: number;
  multiLine?: boolean;
  maxLines?: number;
}

/**
 * TruncatedText - A reusable component for displaying truncated text with tooltips
 * 
 * @param {string} text - The text to display
 * @param {number} maxLength - The maximum length before truncation (default: 40)
 * @param {string} tooltipPosition - The position of the tooltip ("top" or "right", default: "top")
 * @param {string} className - Additional CSS classes for the text
 * @param {number} tooltipMaxWidth - Maximum width for the tooltip in pixels (default: 800)
 * @param {boolean} multiLine - Whether to allow multiple lines of text (default: false)
 * @param {number} maxLines - Maximum number of lines to display when multiLine is true (default: 2)
 * 
 * @returns {JSX.Element} - The truncated text with tooltip
 */
export function TruncatedText({ 
  text, 
  maxLength = 40, 
  tooltipPosition = "top",
  className = "",
  tooltipMaxWidth = 800,
  multiLine = false,
  maxLines = 2
}: TruncatedTextProps) {
  if (!text) return <span className={className}>-</span>;
  
  // If text is shorter than maxLength, just return it
  if (text.length <= maxLength && !multiLine) {
    return <span className={className}>{text}</span>;
  }
  
  // For multi-line mode
  if (multiLine) {
    return (
      <GlobalTooltip content={text} maxWidth={tooltipMaxWidth} position={tooltipPosition}>
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
  
  // For single-line mode (original behavior)
  return (
    <GlobalTooltip content={text} maxWidth={tooltipMaxWidth} position={tooltipPosition}>
      <span className={`whitespace-nowrap ${className}`}>
        {text.substring(0, maxLength)}
        <span className="ml-1 ellipsis-blue">...</span>
      </span>
    </GlobalTooltip>
  );
} 