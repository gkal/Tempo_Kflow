import React from "react";
import { DotLoader } from "react-spinners";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  className?: string;
  delayBeforeSpinner?: number;
  size?: number;
  color?: string;
}

/**
 * Enhanced loading spinner component using react-spinners DotLoader
 * with appropriate container and accessibility features.
 * 
 * @param fullScreen - Whether the spinner should take up the full screen
 * @param className - Additional CSS classes to apply
 * @param delayBeforeSpinner - Milliseconds to delay before showing the spinner (default: 300ms)
 * @param size - Size of the spinner dots (default: 25)
 * @param color - Color of the spinner (default: #84a98c)
 */
const LoadingSpinner = ({
  fullScreen = true,
  className = "",
  delayBeforeSpinner = 300,
  size = 25,
  color = "#84a98c",
}: LoadingSpinnerProps) => {
  const containerClasses = fullScreen
    ? "min-h-screen flex items-center justify-center bg-[#2f3e46]"
    : "flex flex-col items-center justify-center p-12";
    
  return (
    <div 
      className={`${containerClasses} ${className}`} 
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center justify-center">
        <DotLoader
          color={color}
          size={size}
          speedMultiplier={0.8}
          aria-label="Loading"
        />
      </div>
    </div>
  );
};

export default LoadingSpinner;