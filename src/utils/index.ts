/**
 * K-Flow Application Utilities
 * 
 * This file serves as the central entry point for all utility functions in the K-Flow application.
 * It exports various utility functions from different modules for easier imports.
 * 
 * Usage examples:
 * 
 * 1. Import specific utility functions:
 *    import { formatDate, truncateText, logError } from '@/utils';
 * 
 * 2. Import utilities as a namespace:
 *    import { utils } from '@/utils';
 *    utils.formatDate('2023-01-01');
 */

// Core utilities
export * from './formatUtils';
// Export everything except the truncate function (which would cause a naming collision)
export * from './stringUtils';
export * from './styleUtils';
// Explicitly import and rename the truncate function from textUtils to avoid collision
import { truncateWithNullHandling, capitalize, slugify } from './textUtils';
export { truncateWithNullHandling, capitalize, slugify };
// Re-export the alias as textTruncate to avoid collision
import { truncate as textTruncate } from './textUtils';
export { textTruncate };

// Validation utilities
export * from './formValidation';
export * from './validationUtils';

// Error and logging utilities
export * from './errorUtils';
export * from './loggingUtils';
export * from './suppressWarnings';

// API & data utilities
export * from './apiUtils';
export * from './eventUtils';
export * from './consoleReplacer';

// Form utilities
export * from './formHelpers';

// Browser utilities
export * from './browserUtils';

// Component utilities
export * from './componentUtils';

// Import all modules for namespaced exports
import * as formatUtils from './formatUtils';
import * as stringUtils from './stringUtils';
import * as textUtils from './textUtils';
import * as formValidation from './formValidation';
import * as validationUtils from './validationUtils';
import * as loggingUtils from './loggingUtils';
import * as errorUtils from './errorUtils';
import * as apiUtils from './apiUtils';
import * as eventUtils from './eventUtils';
import * as suppressWarnings from './suppressWarnings';
import * as styleUtils from './styleUtils';
import * as formHelpers from './formHelpers';
import * as browserUtils from './browserUtils';
import * as componentUtils from './componentUtils';

/**
 * Initialize utility modules with optional configuration
 * @param options Configuration options for utilities
 */
export function setupUtilities(options?: {
  enableLogging?: boolean;
  suppressWarnings?: boolean;
}) {
  if (options?.suppressWarnings) {
    suppressWarnings.setupWarningSuppressions();
  }
  
  if (options?.enableLogging !== false) {
    loggingUtils.configureLogging({
      level: loggingUtils.LogLevel.INFO,
      enableConsole: true,
      isProd: import.meta.env.MODE === 'production'
    });
  }
}

/**
 * Namespaced export object for organizing related utilities
 */
export const utils = {
  format: formatUtils,
  string: stringUtils,
  text: textUtils,
  validation: {
    ...formValidation,
    ...validationUtils
  },
  error: errorUtils,
  logging: loggingUtils,
  api: apiUtils,
  event: eventUtils,
  styles: styleUtils,
  form: formHelpers,
  browser: browserUtils,
  component: componentUtils
};

export default utils; 