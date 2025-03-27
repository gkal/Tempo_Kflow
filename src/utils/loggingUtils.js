// Simple logging utility for the application

// Log levels enum
export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

// Configuration options
let config = {
  level: LogLevel.INFO,
  enableConsole: true,
  isProd: false
};

// Configure logging settings
export const configureLogging = (options) => {
  config = {
    ...config,
    ...options
  };
};

// Create a prefixed logger for specific components/modules
export const createPrefixedLogger = (prefix) => ({
  info: (message) => {
    if (config.enableConsole && config.level <= LogLevel.INFO) {
      console.log(`[${prefix}] [INFO] ${message}`);
    }
  },
  error: (message) => {
    if (config.enableConsole && config.level <= LogLevel.ERROR) {
      console.error(`[${prefix}] [ERROR] ${message}`);
    }
  },
  warn: (message) => {
    if (config.enableConsole && config.level <= LogLevel.WARN) {
      console.warn(`[${prefix}] [WARN] ${message}`);
    }
  },
  debug: (message) => {
    if (config.enableConsole && config.level <= LogLevel.DEBUG) {
      console.debug(`[${prefix}] [DEBUG] ${message}`);
    }
  }
});

// Individual logging functions
export const logInfo = (message) => {
  if (config.enableConsole && config.level <= LogLevel.INFO) {
    console.log(`[INFO] ${message}`);
  }
};

export const logError = (message) => {
  if (config.enableConsole && config.level <= LogLevel.ERROR) {
    console.error(`[ERROR] ${message}`);
  }
};

export const logWarning = (message) => {
  if (config.enableConsole && config.level <= LogLevel.WARN) {
    console.warn(`[WARN] ${message}`);
  }
};

export const logDebug = (message) => {
  if (config.enableConsole && config.level <= LogLevel.DEBUG) {
    console.debug(`[DEBUG] ${message}`);
  }
};

// Default logger object
const logger = {
  info: logInfo,
  error: logError,
  warn: logWarning,
  debug: logDebug
};

export default logger; 