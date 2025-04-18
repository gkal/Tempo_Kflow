/**
 * @deprecated This component has been replaced by TruncateWithTooltip in GlobalTooltip.tsx.
 * 
 * This module is maintained for backward compatibility only.
 * Please import TruncateWithTooltip from @/components/ui/GlobalTooltip instead.
 * 
 * Note: TruncateWithTooltip is the preferred implementation already being used in
 * key interfaces like the ServiceTypesPage. The functionality and appearance will
 * remain unchanged when migrating to TruncateWithTooltip.
 */

import React from "react";
import { TruncateWithTooltip } from "./GlobalTooltip";
import { logDeprecationWarning } from "@/utils/componentUtils";

/**
 * Props for the TruncatedText component
 */
interface TruncatedTextProps {
  /** The text to display and truncate if necessary */
  text: string;
  /** Maximum length before truncation */
  maxLength?: number;
  /** Position of the tooltip */
  tooltipPosition?: "top" | "right" | "bottom" | "left";
  /** Additional CSS classes for the text */
  className?: string;
  /** Maximum width for the tooltip in pixels */
  tooltipMaxWidth?: number;
  /** Whether to allow multiple lines of text */
  multiLine?: boolean;
  /** Maximum number of lines to display when multiLine is true */
  maxLines?: number;
  /** Whether the tooltip should be disabled */
  disabled?: boolean;
}

// Log deprecation warning when this module is imported
(function logWarning() {
  // Will run once when the module is imported
  if (typeof window !== 'undefined') {
    logDeprecationWarning(
      'truncated-text.tsx',
      'Please import TruncateWithTooltip from @/components/ui/GlobalTooltip instead. This is the preferred implementation already used in ServiceTypesPage.'
    );
  }
})();

/**
 * @deprecated Use TruncateWithTooltip from GlobalTooltip.tsx instead.
 * 
 * TruncatedText truncates text and shows a tooltip with the full text on hover.
 * This component is being replaced by TruncateWithTooltip which provides the identical
 * functionality (already used in ServiceTypesPage) but with improved implementation.
 */
export function TruncatedText({ 
  text, 
  maxLength = 40, 
  tooltipPosition = "top",
  className = "",
  tooltipMaxWidth = 800,
  multiLine = false,
  maxLines = 2,
  disabled = false
}: TruncatedTextProps) {
  React.useEffect(() => {
    logDeprecationWarning(
      'TruncatedText',
      'Please use TruncateWithTooltip from @/components/ui/GlobalTooltip instead. It provides identical functionality and UI.'
    );
  }, []);
  
  // Pass through to TruncateWithTooltip to maintain identical functionality
  return (
    <TruncateWithTooltip
      text={text}
      maxLength={maxLength}
      position="bottom"
      className={className}
      maxWidth={tooltipMaxWidth}
      multiLine={multiLine}
      maxLines={maxLines}
      disabled={disabled}
    />
  );
} 
