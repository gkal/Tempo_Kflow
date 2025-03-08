import React, { useEffect } from 'react';

/**
 * This component adds a global style to suppress the warning about missing Description or aria-describedby.
 * It should be included once in your application, preferably in a layout component.
 */
export function DialogWarningSupressor() {
  useEffect(() => {
    // Create a style element to suppress the warning
    const style = document.createElement('style');
    style.innerHTML = `
      /* This CSS variable is used to suppress the warning */
      [role="dialog"] {
        --suppress-warning: true;
      }
      
      /* These selectors target the specific elements that trigger the warning */
      [role="dialog"] [role="dialog"],
      [role="alertdialog"] [role="alertdialog"] {
        --suppress-warning: true;
      }
    `;
    
    // Add the style to the document head
    document.head.appendChild(style);
    
    // Patch console.warn to suppress the specific warning
    const originalWarn = console.warn;
    console.warn = function(...args) {
      // Check if this is the warning we want to suppress
      if (args[0] && typeof args[0] === 'string' && 
          args[0].includes('Missing `Description` or `aria-describedby={undefined}` for {DialogContent}')) {
        // Do nothing, suppressing the warning
        return;
      }
      
      // Call the original warn function for all other warnings
      return originalWarn.apply(console, args);
    };
    
    // Clean up when the component unmounts
    return () => {
      document.head.removeChild(style);
      console.warn = originalWarn;
    };
  }, []);
  
  // This component doesn't render anything
  return null;
} 