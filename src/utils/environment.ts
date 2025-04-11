/**
 * Utility functions for environment detection.
 * Helps determine the current execution environment (development, production, testing)
 */

/**
 * Check if the application is running in production mode
 * @returns true if in production mode, false otherwise
 */
export function isProduction(): boolean {
  return import.meta.env.MODE === 'production';
}

/**
 * Check if the application is running in development mode
 * @returns true if in development mode, false otherwise
 */
export function isDevelopment(): boolean {
  return import.meta.env.MODE === 'development';
}

/**
 * Check if the application is running in testing mode
 * @returns true if in testing mode, false otherwise
 */
export function isTesting(): boolean {
  return import.meta.env.MODE === 'test' || 
         import.meta.env.VITE_APP_TESTING === 'true';
}

/**
 * Get the current application environment
 * @returns The current environment string ('production', 'development', 'staging', or 'test')
 */
export function getEnvironment(): string {
  if (isProduction()) return 'production';
  if (isTesting()) return 'test';
  if (import.meta.env.MODE === 'staging') return 'staging';
  return 'development';
} 