/**
 * Logging Utilities
 * 
 * A set of standardized logging functions to replace direct console use.
 * These functions provide consistent formatting, error handling, and can be
 * easily configured for different environments.
 * 
 * Benefits:
 * - Consistent logging format across the application
 * - Environment-aware logging (development vs production)
 * - Support for log levels
 * - Ability to easily add remote logging services
 * 
 * @module loggingUtils
 */

/**
 * Log levels for categorizing messages
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Configuration for the logging system
 */
interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  isProd: boolean;
}

/**
 * Current log configuration
 */
const logConfig: LogConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  enableConsole: true,
  isProd: process.env.NODE_ENV === 'production'
};

/**
 * Format a log message with consistent structure
 * 
 * @param level - Log level
 * @param message - Main log message
 * @param data - Optional data to include
 * @returns Formatted log object
 */
function formatLogEntry(level: LogLevel, message: string, data?: any): any {
  const timestamp = new Date().toISOString();
  return {
    level,
    message,
    timestamp,
    data: data || null
  };
}

/**
 * Check if a log level should be displayed based on the current configuration
 * 
 * @param level - Log level to check
 * @returns Whether the log should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const configLevelIndex = levels.indexOf(logConfig.level);
  const currentLevelIndex = levels.indexOf(level);
  
  return currentLevelIndex >= configLevelIndex;
}

/**
 * Log a debug message
 * 
 * @param message - Message to log
 * @param data - Optional data to include
 * 
 * Used in:
 * - Form validation debugging
 * - API request/response debugging
 * - Component lifecycle debugging
 */
export function logDebug(message: string, data?: any): void {
  if (!shouldLog(LogLevel.DEBUG)) return;
  
  const entry = formatLogEntry(LogLevel.DEBUG, message, data);
  
  if (logConfig.enableConsole) {
    console.log(`🔍 DEBUG: ${message}`, data !== undefined ? data : '');
  }
  
  // Could add additional logging targets here (API, file, etc.)
}

/**
 * Log an informational message
 * 
 * @param message - Message to log
 * @param data - Optional data to include
 * 
 * Used in:
 * - User actions (login, logout)
 * - Successful operations
 * - Application state changes
 */
export function logInfo(message: string, data?: any): void {
  if (!shouldLog(LogLevel.INFO)) return;
  
  const entry = formatLogEntry(LogLevel.INFO, message, data);
  
  if (logConfig.enableConsole) {
    console.info(`ℹ️ INFO: ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Log a warning message
 * 
 * @param message - Warning message
 * @param data - Optional data to include
 * 
 * Used in:
 * - Deprecated function usage
 * - Recoverable errors
 * - Performance issues
 */
export function logWarning(message: string, data?: any): void {
  if (!shouldLog(LogLevel.WARN)) return;
  
  const entry = formatLogEntry(LogLevel.WARN, message, data);
  
  if (logConfig.enableConsole) {
    console.warn(`⚠️ WARNING: ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Log an error message
 * 
 * @param message - Error message
 * @param error - Error object or description
 * @param context - Additional context about where the error occurred
 * 
 * Used in:
 * - API call failures
 * - Component errors
 * - Form submission failures
 * - Database operation errors
 */
export function logError(message: string, error?: any, context?: string): void {
  if (!shouldLog(LogLevel.ERROR)) return;
  
  // Format error for better logging
  let errorData: any = { message: 'Unknown error' };
  
  if (error instanceof Error) {
    errorData = {
      message: error.message,
      name: error.name,
      stack: logConfig.isProd ? undefined : error.stack
    };
  } else if (error) {
    errorData = error;
  }
  
  const entry = formatLogEntry(LogLevel.ERROR, message, {
    error: errorData,
    context
  });
  
  if (logConfig.enableConsole) {
    console.error(`❌ ERROR: ${message}`, {
      error: errorData,
      context: context || 'Unknown context'
    });
  }
  
  // In production, could send to error tracking service
}

/**
 * Configure the logging system
 * 
 * @param config - Partial configuration to apply
 */
export function configureLogging(config: Partial<LogConfig>): void {
  Object.assign(logConfig, config);
}

/**
 * Temporarily suppress console output
 * Useful for tests or when many expected errors would pollute the console
 * 
 * @param callback - Function to execute with logging suppressed
 * @returns Result of the callback function
 */
export async function withSuppressedLogging<T>(callback: () => Promise<T>): Promise<T> {
  const originalState = logConfig.enableConsole;
  logConfig.enableConsole = false;
  
  try {
    return await callback();
  } finally {
    logConfig.enableConsole = originalState;
  }
}

/**
 * Create a logger prefixed with a component or module name
 * 
 * @param prefix - Prefix to add to all log messages
 * @returns Object with logging methods
 * 
 * @example
 * ```
 * // In a component file
 * const logger = createPrefixedLogger('CustomerForm');
 * 
 * // Then use it
 * logger.info('Form submitted');
 * logger.error('Submission failed', error);
 * ```
 */
export function createPrefixedLogger(prefix: string) {
  return {
    debug: (message: string, data?: any) => logDebug(`[${prefix}] ${message}`, data),
    info: (message: string, data?: any) => logInfo(`[${prefix}] ${message}`, data),
    warning: (message: string, data?: any) => logWarning(`[${prefix}] ${message}`, data),
    error: (message: string, error?: any, context?: string) => 
      logError(`[${prefix}] ${message}`, error, context || prefix)
  };
}

// Export a default logger for quick use
export default {
  debug: logDebug,
  info: logInfo,
  warning: logWarning,
  error: logError,
  configure: configureLogging,
  createLogger: createPrefixedLogger
}; 