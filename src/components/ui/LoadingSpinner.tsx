import React from "react";
import { Loader, LoaderProps } from "./Loader";

/**
 * Loading spinner component with customizable size and color
 * Uses the global Loader component for consistent styling throughout the application
 */
export interface LoadingSpinnerProps {
  size?: number;
  color?: string; // Color prop kept for backward compatibility
  thickness?: number; // Thickness prop kept for backward compatibility
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner = ({
  size = 40,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) => {
  // Create props for Loader component
  const loaderProps: LoaderProps = {
    size,
    fullScreen,
    className
  };
  
  return <Loader {...loaderProps} />;
};

export default LoadingSpinner;
