/**
 * @deprecated All tooltip components have been moved to GlobalTooltip.tsx.
 * 
 * This module is maintained for backward compatibility only.
 * Please import tooltip components from @/components/ui/GlobalTooltip instead.
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
      'Please import tooltip components from @/components/ui/GlobalTooltip instead.'
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
  SafeTooltip as SimpleTooltip
};

// Default export for backward compatibility
export default GlobalTooltip;
