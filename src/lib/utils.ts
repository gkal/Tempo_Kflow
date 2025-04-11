import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDate } from "@/utils/formatUtils";

/**
 * @deprecated Import the cn function from '@/utils/styleUtils' instead.
 * 
 * This function combines multiple class names using clsx and tailwind-merge.
 * The functionality has been moved to the central styleUtils module for better organization.
 * 
 * @param inputs - Class names to combine
 * @returns Combined class name string
 * 
 * @example
 * // Use this instead:
 * import { cn } from '@/utils/styleUtils';
 * // or
 * import { cn } from '@/utils';
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatDate };

/**
 * Format a file size in bytes to a human-readable string
 * @param bytes File size in bytes
 * @param decimals Number of decimal places
 * @returns Formatted file size string (e.g., '1.5 KB')
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format a duration in milliseconds to a human-readable string
 * @param ms Duration in milliseconds
 * @returns Formatted duration string (e.g., '1.5 seconds' or '2.3 minutes')
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)} seconds`;
  } else if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)} minutes`;
  } else {
    return `${(ms / 3600000).toFixed(1)} hours`;
  }
}

/**
 * Truncate a string to a specified length and add ellipsis
 * @param str String to truncate
 * @param length Maximum length
 * @returns Truncated string
 */
export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Debounce a function
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Get a contrasting text color (black or white) based on background color
 * @param hexColor Hex color code (e.g., #FF0000)
 * @returns 'black' or 'white' based on which has better contrast
 */
export function getContrastColor(hexColor: string): 'black' | 'white' {
  // Remove # if present
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for bright colors, white for dark colors
  return luminance > 0.5 ? 'black' : 'white';
}
