/**
 * @deprecated All tooltip components have been moved to GlobalTooltip.tsx.
 * 
 * This module is maintained for backward compatibility only.
 * Please import tooltip components from @/components/ui/GlobalTooltip instead.
 * 
 * Usage examples:
 * 
 * Old import (deprecated):
 * import { SimpleTooltip } from '@/components/ui/tooltip';
 * 
 * New import:
 * import { SafeTooltip } from '@/components/ui/GlobalTooltip';
 * 
 * Tip: To prevent tooltip flickering issues, always wrap the target element with GlobalTooltip
 * and add pointer-events-none to elements that shouldn't capture mouse events.
 */

import { logDeprecationWarning } from '@/utils/componentUtils';
import React from 'react';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
  TooltipArrow,
  GlobalTooltip,
  SafeTooltip,
  TruncateWithTooltip
} from "./GlobalTooltip";

// Log deprecation warning when this module is imported
(function logWarning() {
  // Will run once when the module is imported
  if (typeof window !== 'undefined') {
    logDeprecationWarning(
      'tooltip.tsx',
      'Please import tooltip components from @/components/ui/GlobalTooltip instead. ' +
      'See the component file header for migration examples and tips to prevent flickering.'
    );
  }
})();

// Re-export for backward compatibility
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
  TooltipArrow,
  GlobalTooltip as RadixTooltip,
  SafeTooltip as SimpleTooltip,
  TruncateWithTooltip
};

// Default export for backward compatibility
export default GlobalTooltip;
