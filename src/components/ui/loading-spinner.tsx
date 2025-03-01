import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  color = "#cad2c5",
  className = "",
}: LoadingSpinnerProps) {
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
