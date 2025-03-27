import React, { memo } from 'react';
import { GlobalTooltip } from './GlobalTooltip';

/**
 * New Ellipsis Test component to use instead of EllipsisWithTooltip
 * This is a completely separate file to avoid any caching or conflicts
 */
const InfoBox = memo(() => {
  return (
    <span 
      className="ellipsis-blue"
      style={{ 
        marginLeft: '4px',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#60a5fa',
      }}
    >
      ...
    </span>
  );
});
InfoBox.displayName = 'InfoBox';

/**
 * Test component to use instead of EllipsisWithTooltip 
 */
export function TestEllipsis({
  content,
  maxWidth = 800,
  position = "top",
  className = "",
  disabled = false,
  delay = 250,
}: {
  content: React.ReactNode;
  maxWidth?: number;
  position?: "top" | "bottom";
  className?: string;
  disabled?: boolean;
  delay?: number;
}) {
  if (disabled) {
    return <InfoBox />;
  }
  
  console.log("RENDERING TEST ELLIPSIS COMPONENT");
  
  return (
    <GlobalTooltip
      content={content}
      position={position}
      maxWidth={maxWidth}
      className={className}
      delay={delay}
    >
      <InfoBox />
    </GlobalTooltip>
  );
} 