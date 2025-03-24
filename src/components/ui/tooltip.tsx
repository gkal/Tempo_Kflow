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
  useTooltip,
  RadixTooltip as CustomTooltip,
  SimpleTooltip as OriginalSimpleTooltip
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

// Create a wrapped SimpleTooltip that logs deprecation warnings
const SimpleTooltip = (props: Parameters<typeof OriginalSimpleTooltip>[0]) => {
  React.useEffect(() => {
    logDeprecationWarning(
      'SimpleTooltip',
      'Please use SimpleTooltip from @/components/ui/GlobalTooltip instead.'
    );
  }, []);
  
  return <OriginalSimpleTooltip {...props} />;
};

// Re-export for backward compatibility
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  useTooltip,
  CustomTooltip,
  SimpleTooltip
};

// Default export for backward compatibility
export default CustomTooltip;
