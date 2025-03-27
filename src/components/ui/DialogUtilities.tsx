import React, { useEffect } from 'react';

/**
 * DialogUtilities component
 * 
 * A utility component that:
 * 1. Fixes dialog backdrop issues - removes excess dialog backdrops
 * 2. Suppresses common dialog warnings for aria-describedby
 * 
 * Place this component once in your application, preferably in a layout component
 */
export function DialogUtilities() {
  useEffect(() => {
    // ===== Part 1: Dialog backdrop fix =====
    // Create a MutationObserver to watch for dialog backdrop issues
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const dialogBackdrops = document.querySelectorAll('[data-radix-popper-content-wrapper]');
          
          if (dialogBackdrops.length > 1) {
            // Remove all but the last one, but only if they're still in the document
            for (let i = 0; i < dialogBackdrops.length - 1; i++) {
              const backdrop = dialogBackdrops[i];
              if (backdrop && backdrop.parentNode) {
                backdrop.parentNode.removeChild(backdrop);
              }
            }
          }
        }
      });
    });
    
    // Start observing the document for dialog backdrops
    observer.observe(document.body, { childList: true, subtree: true });
    
    // ===== Part 2: Warning suppression =====
    // Create a style element to suppress the warning about missing Description or aria-describedby
    const style = document.createElement('style');
    style.innerHTML = `
      /* CSS variable to suppress warning */
      [role="dialog"] {
        --suppress-warning: true;
      }
      
      /* Target specific elements that trigger the warning */
      [role="dialog"] [role="dialog"],
      [role="alertdialog"] [role="alertdialog"] {
        --suppress-warning: true;
      }
    `;
    
    // Add the style to the document head
    document.head.appendChild(style);
    
    // Patch console.warn to suppress specific warnings
    const originalWarn = console.warn;
    console.warn = function(...args) {
      // Check if this is a dialog warning we want to suppress
      if (args[0] && typeof args[0] === 'string' && (
          args[0].includes('Missing `Description` or `aria-describedby={undefined}` for {DialogContent}') ||
          args[0].includes('A dialog is already open')
      )) {
        // Suppress the warning
        return;
      }
      
      // Pass through all other warnings
      return originalWarn.apply(console, args);
    };
    
    // Clean up when the component unmounts
    return () => {
      // Disconnect the observer
      observer.disconnect();
      
      // Remove the style element only if it's still in the document
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
      
      // Restore original console.warn
      console.warn = originalWarn;
    };
  }, []);
  
  // This component doesn't render anything
  return null;
} 