import React from "react";

/**
 * Modern loader using animated spinner animation.
 * Usage: <Loader fullScreen /> or <Loader />
 * Fully accessible and styled for global use.
 */
export interface LoaderProps {
  fullScreen?: boolean;
  className?: string;
  size?: number;
}

export const Loader: React.FC<LoaderProps> = ({ fullScreen = false, className = '', size = 40 }) => {
  // Scale factor based on requested size
  const scale = size / 50; // 50px is the base size in the original CSS
  
  return (
    <div
      className={fullScreen
        ? `fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${className}`
        : `flex items-center justify-center ${className}`
      }
      role="status"
      aria-live="polite"
      aria-label="Loading"
      tabIndex={0}
    >
      <span className="sr-only">Loading...</span>
      {/* Loader animation */}
      <div className="loader" style={{ 
        height: `${50 * scale}px`, 
        width: `${50 * scale}px` 
      }} />
      {/* Scoped CSS for loader */}
      <style>{`
        .loader {
          animation: rotate 1s infinite;
          height: ${50 * scale}px;
          width: ${50 * scale}px;
        }

        .loader:before,
        .loader:after {
          border-radius: 50%;
          content: "";
          display: block;
          height: ${20 * scale}px;
          width: ${20 * scale}px;
        }
        
        .loader:before {
          animation: ball1 1s infinite;
          background-color: #cad2c5;
          box-shadow: ${30 * scale}px 0 0 #52796f;
          margin-bottom: ${10 * scale}px;
        }
        
        .loader:after {
          animation: ball2 1s infinite;
          background-color: #52796f;
          box-shadow: ${30 * scale}px 0 0 #cad2c5;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg) scale(0.8) }
          50% { transform: rotate(360deg) scale(1.2) }
          100% { transform: rotate(720deg) scale(0.8) }
        }

        @keyframes ball1 {
          0% {
            box-shadow: ${30 * scale}px 0 0 #52796f;
          }
          50% {
            box-shadow: 0 0 0 #52796f;
            margin-bottom: 0;
            transform: translate(${15 * scale}px, ${15 * scale}px);
          }
          100% {
            box-shadow: ${30 * scale}px 0 0 #52796f;
            margin-bottom: ${10 * scale}px;
          }
        }

        @keyframes ball2 {
          0% {
            box-shadow: ${30 * scale}px 0 0 #cad2c5;
          }
          50% {
            box-shadow: 0 0 0 #cad2c5;
            margin-top: -${20 * scale}px;
            transform: translate(${15 * scale}px, ${15 * scale}px);
          }
          100% {
            box-shadow: ${30 * scale}px 0 0 #cad2c5;
            margin-top: 0;
          }
        }
      `}</style>
    </div>
  );
}; 
