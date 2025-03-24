/**
 * Global type definitions for the application
 */

// Define custom properties on the Window object
interface Window {
  // Custom logging functions (referenced in suppressWarnings.ts)
  originalLog?: () => void;
  customLog?: () => void;
  
  // Any other global variables needed throughout the application
}

// Global events used in the application
interface CustomEventMap {
  'customer:updated': CustomEvent<{ id: string; data: unknown }>;
  'customer:deleted': CustomEvent<{ id: string }>;
  'offer:updated': CustomEvent<{ id: string; data: unknown }>;
  'offer:created': CustomEvent<{ id: string; data: unknown }>;
}

// Extend the global EventTarget interface to include our custom events
declare global {
  interface Document {
    addEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (ev: CustomEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<K extends keyof CustomEventMap>(
      type: K,
      listener: (ev: CustomEventMap[K]) => void,
      options?: boolean | EventListenerOptions
    ): void;
    dispatchEvent<K extends keyof CustomEventMap>(ev: CustomEventMap[K]): boolean;
  }
}

// Add module declarations for utility files
declare module './utils/formValidation' {
  export function setupCustomValidationMessages(): void;
  export const ValidationMessages: Record<string, string | ((length: number) => string)>;
  export const ValidationPatterns: Record<string, RegExp>;
  export function checkRequiredFields(form: HTMLFormElement): boolean;
  export function setCustomValidationMessage(
    event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    message?: string
  ): void;
}

declare module './utils/suppressWarnings' {
  export function setupWarningSuppressions(): () => void;
  export function addWarningSuppressionPattern(pattern: string): void;
  export function setupLogSuppressions(): () => void;
  export function disableCustomLoggingFunctions(): void;
} 