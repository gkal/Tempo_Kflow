import React, { useEffect, useState } from "react";
import LoadingDots from "./LoadingDots";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
  delayBeforeSpinner?: number;
}

/**
 * Enhanced loading spinner component with appropriate container
 * and accessibility features. Shows dots first, then transitions to a spinner
 * for better loading state visualization.
 * 
 * @param message - Text to display as aria-label and screen reader content
 * @param fullScreen - Whether the spinner should take up the full screen
 * @param className - Additional CSS classes to apply
 * @param delayBeforeSpinner - Milliseconds to delay before showing the spinner (default: 800ms)
 */
const LoadingSpinner = ({
  message = "Loading...",
  fullScreen = true,
  className = "",
  delayBeforeSpinner = 800,
}: LoadingSpinnerProps) => {
  const [showSpinner, setShowSpinner] = useState(false);
  
  useEffect(() => {
    // Show dots first, then transition to spinner after delay
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, delayBeforeSpinner);
    
    return () => clearTimeout(timer);
  }, [delayBeforeSpinner]);
  
  const containerClasses = fullScreen
    ? "min-h-screen flex items-center justify-center bg-[#2f3e46]"
    : "flex flex-col items-center justify-center p-8";
    
  return (
    <div 
      className={`${containerClasses} ${className}`} 
      aria-label={message}
      role="status"
    >
      {/* Always show dots initially, then fade in the spinner */}
      <div className={`transition-opacity duration-300 ${showSpinner ? "opacity-0 h-0 overflow-hidden" : "opacity-100"}`}>
        <LoadingDots size="md" color="#cad2c5" />
      </div>
      
      {/* Spinner appears after the delay */}
      {showSpinner && (
        <div className="opacity-100 transition-opacity duration-300 flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-[#84a98c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          
          {/* Add a visible message */}
          <div className="mt-3 text-sm text-[#cad2c5]">{message}</div>
        </div>
      )}
      
      {message && (
        <div className="sr-only">{message}</div>
      )}
    </div>
  );
};

export default LoadingSpinner;