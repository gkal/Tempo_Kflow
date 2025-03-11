// Feature flags to control when features are enabled
// This allows you to deploy code but keep it disabled until ready

// Get environment variables or use defaults
const isDevelopment = import.meta.env.MODE === 'development';

// Feature flags object - centralized place to manage all feature toggles
export const FeatureFlags = {
  // Use the new task creation logic with due_date
  useNewTaskCreation: isDevelopment || import.meta.env.VITE_ENABLE_NEW_TASK_CREATION === 'true',
  
  // Use the updated column names in the database
  useUpdatedColumnNames: isDevelopment || import.meta.env.VITE_ENABLE_UPDATED_COLUMN_NAMES === 'true',
  
  // Enable debug logging
  enableDebugLogging: isDevelopment || import.meta.env.VITE_ENABLE_DEBUG_LOGGING === 'true',
};

// Helper function to check if a feature is enabled
export function isFeatureEnabled(featureName: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[featureName] === true;
}

// Helper function for logging that respects the debug flag
export function debugLog(...args: any[]): void {
  if (FeatureFlags.enableDebugLogging) {
    console.log(...args);
  }
} 