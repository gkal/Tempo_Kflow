/**
 * Utility for suppressing console warnings and logs
 * 
 * This module provides functions to suppress:
 * - Specific console warnings (like accessibility warnings)
 * - Vite HMR (Hot Module Replacement) logs
 * - React DevTools messages
 * - Any custom logging functions
 */

// Warning patterns to suppress
const WARNING_PATTERNS = [
  'Missing `Description` or `aria-describedby`',
  'aria-describedby={undefined}'
];

// Store original console methods to restore them if needed
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

// Define types for custom logging functions that might exist on window
interface CustomLogging {
  originalLog?: () => void;
  customLog?: () => void;
}

// Type extension for Window to include potential custom logging functions
declare global {
  interface Window extends CustomLogging {}
}

/**
 * Sets up suppression of specific console warnings
 * 
 * Used in:
 * - App.tsx (on application startup)
 * - Any component that needs to suppress specific warnings
 * 
 * @returns A cleanup function to restore the original console.warn behavior
 */
export function setupWarningSuppressions(): () => void {
  console.warn = function(message: any, ...args: any[]) {
    // Check if the message is a string and matches any of our patterns to ignore
    const isIgnoredWarning = typeof message === 'string' && 
      WARNING_PATTERNS.some(pattern => message.includes(pattern));
    
    // Only log warnings that aren't in our ignore list
    if (!isIgnoredWarning) {
      originalConsoleWarn.apply(console, [message, ...args]);
    }
  };

  // Return a cleanup function
  return () => {
    console.warn = originalConsoleWarn;
  };
}

/**
 * Adds a new pattern to the list of warnings to suppress
 * 
 * @param pattern The string pattern to match in warning messages
 */
export function addWarningSuppressionPattern(pattern: string): void {
  if (!WARNING_PATTERNS.includes(pattern)) {
    WARNING_PATTERNS.push(pattern);
  }
}

/**
 * Sets up suppression of Vite HMR and React DevTools messages
 * 
 * @returns A cleanup function to restore original console.log behavior
 */
export function setupLogSuppressions(): () => void {
  // Suppress Vite HMR and React DevTools messages
  console.log = function(...args: any[]): void {
    const firstArg = args[0];
    
    // Skip unwanted messages
    const shouldSkip = typeof firstArg === 'string' && (
      firstArg.includes('[vite]') || 
      firstArg.includes('Download the React DevTools')
    );
    
    if (shouldSkip) return;
    
    // Pass through other messages
    originalConsoleLog.apply(console, args);
  };

  // Suppress Vite info messages
  console.info = function(...args: any[]): void {
    const firstArg = args[0];
    
    // Skip Vite messages
    if (typeof firstArg === 'string' && firstArg.includes('[vite]')) {
      return;
    }
    
    // Pass through other messages
    originalConsoleInfo.apply(console, args);
  };

  // Return a cleanup function
  return () => {
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
  };
}

/**
 * Disable custom logging functions if they exist on the window object
 */
export function disableCustomLoggingFunctions(): void {
  if (typeof window !== 'undefined' && (window.originalLog || window.customLog)) {
    // Store original functions if they exist (for reference)
    const originalLog = window.originalLog;
    const customLog = window.customLog;
    
    // Replace with no-op functions
    window.originalLog = () => {};
    window.customLog = () => {};
    
    // Log that we've disabled custom logging
    originalConsoleLog('Custom logging functions have been disabled');
  }
} 