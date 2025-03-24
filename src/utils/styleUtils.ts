/**
 * Style Utilities for K-Flow Application
 * 
 * Global utilities for styling components consistently throughout the K-Flow application.
 * This module consolidates duplicate styling functions that were previously scattered across
 * the codebase and provides a unified interface for applying consistent styles.
 * 
 * Usage:
 * ```tsx
 * // Import specific utilities
 * import { cn, getStatusClass, getInputClasses } from '@/utils/styleUtils';
 * 
 * // In a component
 * <div className={cn(
 *   "base-class", 
 *   isActive && "active-class", 
 *   hasError && "error-class"
 * )}>
 *   <span className={getStatusClass(status)}>
 *     {formatStatus(status)}
 *   </span>
 *   <input className={getInputClasses(hasError, isDisabled)} />
 * </div>
 * ```
 * 
 * Files using these utilities:
 * - src/components/ui/*.tsx: UI component styling
 * - src/components/customers/*.tsx: Customer component styling
 * - src/components/offers/*.tsx: Offer component styling
 * - src/components/layout/*.tsx: Layout styling
 * 
 * Benefits:
 * - Consistent styling across components
 * - Type-safe styling helpers
 * - Reduced code duplication
 * - Centralized style management
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ===== Tailwind Class Utilities =====

/**
 * Combines class names with intelligent conflict resolution using clsx and tailwind-merge
 * @param inputs - The class values to be combined
 * @returns A merged class string with conflicts resolved according to Tailwind's specificity rules
 * @example
 * cn('px-2 py-4', 'bg-red-500', isActive && 'bg-blue-600') // Returns non-conflicting class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Combines class names from an object with boolean values
 * @param classes - An object with class names as keys and booleans as values
 * @returns A space-separated string of class names
 * @example
 * classNames({ 'text-red-500': hasError, 'bg-green-100': isSuccess })
 */
export function classNames(classes: Record<string, boolean>) {
  return Object.entries(classes)
    .filter(([_, value]) => Boolean(value))
    .map(([key]) => key)
    .join(' ');
}

/**
 * Makes a style object immutable to prevent accidental modifications
 * @param obj - The style object to freeze
 * @returns The frozen style object
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (
      obj[prop as keyof T] !== null && 
      (typeof obj[prop as keyof T] === 'object' || typeof obj[prop as keyof T] === 'function') &&
      !Object.isFrozen(obj[prop as keyof T])
    ) {
      deepFreeze(obj[prop as keyof T] as object);
    }
  });
  return obj;
}

/**
 * Gets a value from a style object with proper typing
 * @param obj - The style object
 * @param keys - The nested keys to access
 * @returns The value at the specified path
 */
export function getStyleValue<T extends object, K extends keyof T>(
  obj: T, 
  ...keys: K[]
): any {
  return keys.reduce((acc, key) => acc?.[key], obj as any);
}

// ===== Status & Result Styling =====

// Status and result types used in the application
export type StatusType = 'pending' | 'processing' | 'wait_for_our_answer' | 'completed' | 'canceled' | 'rejected';
export type ResultType = 'success' | 'error' | 'warning' | 'info' | 'neutral';

// Status translations (Greek)
const statusLabels: Record<StatusType, string> = {
  pending: 'Εκκρεμεί',
  processing: 'Σε επεξεργασία',
  wait_for_our_answer: 'Αναμονή για απάντησή μας',
  completed: 'Ολοκληρώθηκε',
  canceled: 'Ακυρώθηκε',
  rejected: 'Απορρίφθηκε'
};

// Result translations (Greek)
const resultLabels: Record<ResultType, string> = {
  success: 'Επιτυχία',
  error: 'Σφάλμα',
  warning: 'Προειδοποίηση',
  info: 'Πληροφορία',
  neutral: 'Ουδέτερο'
};

// Status Tailwind classes for consistent styling
const statusClasses: Record<StatusType, string> = {
  pending: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  wait_for_our_answer: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-green-500/20 text-green-400',
  canceled: 'bg-gray-500/20 text-gray-400',
  rejected: 'bg-red-500/20 text-red-400'
};

// Result Tailwind classes for consistent styling
const resultClasses: Record<ResultType, string> = {
  success: 'bg-green-500/20 text-green-400',
  error: 'bg-red-500/20 text-red-400',
  warning: 'bg-amber-500/20 text-amber-400',
  info: 'bg-blue-500/20 text-blue-400',
  neutral: 'bg-slate-500/20 text-slate-400'
};

/**
 * Formats a status code to a user-friendly string
 * @param status - The status code
 * @returns The formatted status string
 */
export function formatStatus(status: StatusType): string {
  return statusLabels[status] || status;
}

/**
 * Formats a result code to a user-friendly string
 * @param result - The result code
 * @returns The formatted result string
 */
export function formatResult(result: ResultType): string {
  return resultLabels[result] || result;
}

/**
 * Gets Tailwind classes for styling a status
 * @param status - The status code
 * @returns The Tailwind classes for the status
 */
export function getStatusClass(status: StatusType): string {
  return statusClasses[status] || '';
}

/**
 * Gets Tailwind classes for styling a result
 * @param result - The result code
 * @returns The Tailwind classes for the result
 */
export function getResultClass(result: ResultType): string {
  return resultClasses[result] || '';
}

// ===== Component-Specific Styling =====

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Gets classes for close buttons with consistent styling
 * @param size - The button size
 * @param hasBackground - Whether the button has a background
 * @returns The Tailwind classes for the close button
 */
export function getCloseButtonClasses(
  size: ButtonSize = 'md', 
  hasBackground: boolean = true
): string {
  const baseClasses = 'rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
  
  const sizeClasses: Record<ButtonSize, string> = {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2'
  };
  
  const bgClasses = hasBackground 
    ? 'bg-gray-100 hover:bg-gray-200 text-gray-500' 
    : 'text-gray-400 hover:text-gray-500';
  
  return cn(baseClasses, sizeClasses[size], bgClasses);
}

/**
 * Gets classes for tooltip positioning
 * @param position - The tooltip position
 * @returns The Tailwind classes for the tooltip position
 */
export function getTooltipPositionClass(position: TooltipPosition): string {
  const baseClasses = 'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-sm';
  
  const positionClasses: Record<TooltipPosition, string> = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };
  
  return cn(baseClasses, positionClasses[position]);
}

/**
 * Gets classes for a skeleton loading state
 * @param className - Additional classes to merge
 * @returns The Tailwind classes for the skeleton
 */
export function getSkeletonClasses(className?: string): string {
  return cn(
    'animate-pulse rounded bg-gray-200 dark:bg-gray-700',
    className
  );
}

/**
 * Gets classes for form input elements with consistent styling
 * @param hasError - Whether the input has an error
 * @param isDisabled - Whether the input is disabled
 * @returns The Tailwind classes for the input
 */
export function getInputClasses(hasError: boolean = false, isDisabled: boolean = false): string {
  return cn(
    'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
    hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
    isDisabled && 'bg-gray-100 cursor-not-allowed'
  );
}

// Export all style utilities as a namespace for cleaner imports
export const styles = {
  cn,
  classNames,
  deepFreeze,
  getStyleValue,
  formatStatus,
  formatResult,
  getStatusClass,
  getResultClass,
  getCloseButtonClasses,
  getTooltipPositionClass,
  getSkeletonClasses,
  getInputClasses
};

// Export default for convenient imports
export default styles; 