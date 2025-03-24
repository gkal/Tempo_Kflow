/**
 * Feature flags system to control when features are enabled
 * This allows deploying code but keeping it disabled until ready
 */
import React from 'react';

// Determine current environment
const ENV = {
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  isStaging: import.meta.env.MODE === 'staging'
};

/**
 * Helper to get environment variable as boolean with fallback
 */
const getBooleanFlag = (key: string, defaultValue: boolean = false): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

/**
 * Type for all feature flag names
 */
export enum FeatureName {
  NewTaskCreation = 'useNewTaskCreation',
  UpdatedColumnNames = 'useUpdatedColumnNames',
  DebugLogging = 'enableDebugLogging',
  ImprovedOffers = 'useImprovedOffers',
  EnhancedNotifications = 'useEnhancedNotifications',
  RealTimeUpdates = 'useRealTimeUpdates'
}

/**
 * All feature flags and their enabled status
 * Centralized place to manage all feature toggles
 */
export const FeatureFlags = {
  // Task management features
  [FeatureName.NewTaskCreation]: ENV.isDevelopment || 
    getBooleanFlag('VITE_ENABLE_NEW_TASK_CREATION'),
  
  // Database schema features
  [FeatureName.UpdatedColumnNames]: ENV.isDevelopment || 
    getBooleanFlag('VITE_ENABLE_UPDATED_COLUMN_NAMES'),
  
  // Offer management features
  [FeatureName.ImprovedOffers]: ENV.isDevelopment || 
    getBooleanFlag('VITE_ENABLE_IMPROVED_OFFERS'),
  
  // Notification features
  [FeatureName.EnhancedNotifications]: ENV.isDevelopment || 
    getBooleanFlag('VITE_ENABLE_ENHANCED_NOTIFICATIONS'),
  
  // Communication features
  [FeatureName.RealTimeUpdates]: ENV.isDevelopment || 
    getBooleanFlag('VITE_ENABLE_REAL_TIME_UPDATES'),
  
  // Debugging features
  [FeatureName.DebugLogging]: ENV.isDevelopment || 
    getBooleanFlag('VITE_ENABLE_DEBUG_LOGGING')
};

/**
 * Check if a feature is enabled
 * @param featureName - Name of the feature to check
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(featureName: FeatureName): boolean {
  return FeatureFlags[featureName] === true;
}

/**
 * Apply a function only if a feature is enabled
 * @param featureName - Feature to check
 * @param fn - Function to run if feature is enabled
 */
export function withFeature<T>(
  featureName: FeatureName, 
  fn: () => T, 
  fallbackFn?: () => T
): T | undefined {
  if (isFeatureEnabled(featureName)) {
    return fn();
  } else if (fallbackFn) {
    return fallbackFn();
  }
  return undefined;
}

/**
 * Log message only if debug logging is enabled
 * @param args - Arguments to log
 */
export function debugLog(...args: any[]): void {
  // Silent in production for now
  // Uncomment the following line to re-enable debug logging when needed
  // if (isFeatureEnabled(FeatureName.DebugLogging)) {
  //   console.log('[DEBUG]', ...args);
  // }
}

/**
 * Log error message regardless of debug setting
 * @param args - Arguments to log
 */
export function errorLog(...args: any[]): void {
  console.error('[ERROR]', ...args);
}

/**
 * Create a component wrapper based on feature flag
 * @param featureName - Feature to check
 * @param EnabledComponent - Component to use when feature is enabled
 * @param DisabledComponent - Component to use when feature is disabled (optional)
 */
export function featureGate<P extends object>(
  featureName: FeatureName,
  EnabledComponent: React.ComponentType<P>,
  DisabledComponent?: React.ComponentType<P>
): React.FC<P> {
  return function FeatureGatedComponent(props: P) {
    if (isFeatureEnabled(featureName)) {
      return React.createElement(EnabledComponent, props);
    } 
    if (DisabledComponent) {
      return React.createElement(DisabledComponent, props);
    }
    return null;
  };
} 