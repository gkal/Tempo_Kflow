import React from "react";

interface LoadingDotProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

/**
 * Simple animated loading dots spinner
 * @param size - Size of the dots: "sm" | "md" | "lg"
 * @param color - Color of the dots (hex, rgb, etc.)
 * @param className - Additional CSS classes to apply
 */
export function LoadingDots({
  size = "md",
  color = "#cad2c5",
  className = "",
}: LoadingDotProps) {
  const sizeMap = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-3 w-3",
  };

  const dotSize = sizeMap[size];

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <div
        className={`${dotSize} rounded-full animate-bounce`}
        style={{ backgroundColor: color }}
      />
      <div
        className={`${dotSize} rounded-full animate-bounce [animation-delay:0.2s]`}
        style={{ backgroundColor: color }}
      />
      <div
        className={`${dotSize} rounded-full animate-bounce [animation-delay:0.4s]`}
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

export default LoadingDots; 