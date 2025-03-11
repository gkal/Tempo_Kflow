// Add type declarations for window properties
declare global {
  interface Window {
    originalLog?: () => void;
    customLog?: () => void;
  }
}

/**
 * This script suppresses Vite's HMR logs and React DevTools messages in the browser console
 * as well as any custom logging functions
 */

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

// Override console.log to filter out Vite HMR messages and Form context logs
console.log = function(...args: any[]) {
  // Skip Vite HMR messages and Form context logs
  const firstArg = args[0];
  if (typeof firstArg === 'string' && 
      (firstArg.includes('[vite]') || 
       firstArg.includes('Download the React DevTools') ||
       firstArg.includes('Form context:'))) {  // Add this condition
    return;
  }
  
  // Pass through other messages
  originalConsoleLog.apply(console, args);
};

// Override console.info to filter out Vite messages
console.info = function(...args: any[]) {
  // Skip Vite messages
  const firstArg = args[0];
  if (typeof firstArg === 'string' && firstArg.includes('[vite]')) {
    return;
  }
  
  // Pass through other messages
  originalConsoleInfo.apply(console, args);
};

// Handle custom logging functions if they exist
if (window.originalLog || window.customLog) {
  // Store original functions if they exist
  const originalLog = window.originalLog;
  const customLog = window.customLog;
  
  // Replace with no-op functions
  window.originalLog = () => {};
  window.customLog = () => {};
  
  // Log that we've disabled custom logging
  originalConsoleLog('Custom logging functions have been disabled');
}

export {}; 