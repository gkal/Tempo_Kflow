/**
 * Component utility functions and helpers
 * 
 * This file contains utility functions for component management, including
 * component deprecation handling, migration utilities, and other component-related
 * helper functions.
 * 
 * @module componentUtils
 */

import React from 'react';

/**
 * Logs a component deprecation warning with proper formatting
 * 
 * @param componentName - Name of the deprecated component
 * @param replacementInfo - Information about what to use instead
 * @param since - Version since the component was deprecated
 * 
 * Used in:
 * - src/components/ui/tooltip.tsx
 * - src/components/ui/truncated-text.tsx
 * - src/components/ui/tabs.tsx
 * - src/components/ui/custom-tabs.tsx
 */
export const logDeprecationWarning = (
  componentName: string,
  replacementInfo: string,
  since?: string
): void => {
  const sinceMsg = since ? ` (since v${since})` : '';
  console.warn(
    `[Deprecation Warning]${sinceMsg}: ${componentName} is deprecated. ${replacementInfo}`
  );
};

/**
 * Creates a migration helper function that wraps a deprecated component
 * This allows for smooth migration by providing deprecation warnings while maintaining compatibility
 * 
 * @param OriginalComponent - The original component to wrap
 * @param componentName - Name of the component for warning messages
 * @param replacementInfo - Information about what to use instead
 * @returns The wrapped component with warning
 */
export function withDeprecationWarning<P extends object>(
  OriginalComponent: React.ComponentType<P>,
  componentName: string,
  replacementInfo: string
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    React.useEffect(() => {
      logDeprecationWarning(componentName, replacementInfo);
    }, []);
    
    // Use JSX syntax to render the original component with props
    return React.createElement(OriginalComponent, props);
  };
  
  // Set display name for better debugging
  WrappedComponent.displayName = `Deprecated(${componentName})`;
  
  return WrappedComponent;
} 