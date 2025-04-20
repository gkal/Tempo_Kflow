/**
 * Display utility functions for customer components
 */
import React from 'react';

/**
 * Safely renders HTML highlight spans created by highlightMatchingText
 * This is needed to interpret the HTML string returned by highlightMatchingText
 * and convert it to proper React JSX
 * 
 * @param htmlString The HTML string returned by highlightMatchingText
 * @returns React element or text content
 */
export const dangerouslyRenderHighlight = (htmlString: string): React.ReactNode => {
  if (!htmlString) return htmlString;
  
  // Check if this is a highlighted span
  if (htmlString.startsWith('<span class="bg-yellow') && htmlString.endsWith('</span>')) {
    // Extract the class name and content
    const classMatch = htmlString.match(/class="([^"]+)"/);
    const contentMatch = htmlString.match(/>([^<]+)</);
    
    if (classMatch && contentMatch) {
      const className = classMatch[1];
      const content = contentMatch[1];
      
      // Return a React span element with the appropriate class
      return React.createElement('span', { className }, content);
    }
  }
  
  // If it's not a highlight span or we couldn't parse it, return as-is
  return htmlString;
}; 