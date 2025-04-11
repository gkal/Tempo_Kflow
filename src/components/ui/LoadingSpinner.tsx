import React from "react";
import { DotLoader } from "react-spinners";

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
}

/**
 * Loading spinner component with customizable size and color
 * Used for loading states throughout the application
 */
const LoadingSpinner = ({
  size = 40,
  color = '#3b82f6', // Default to blue-500
  thickness = 4,
}: LoadingSpinnerProps) => {
  // Calculate spinner dimensions based on size
  const viewBoxSize = 24;
  const centerPoint = viewBoxSize / 2;
  const radius = (viewBoxSize - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <div className="inline-block" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
      >
        <circle
          cx={centerPoint}
          cy={centerPoint}
          r={radius}
          fill="none"
          stroke="#e5e7eb" // Default to gray-200
          strokeWidth={thickness}
        />
        <circle
          cx={centerPoint}
          cy={centerPoint}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.75} // Show 25% of the circle
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default LoadingSpinner;