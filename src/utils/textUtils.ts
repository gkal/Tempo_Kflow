/**
 * Text Processing Utilities
 * 
 * This module provides functions for processing and manipulating text content
 * beyond basic string operations. It handles null/undefined values safely and
 * provides specialized text formatting for the UI.
 * 
 * @module textUtils
 */

/**
 * Truncates text to a specified length with ellipsis
 * 
 * This variant safely handles null/undefined values and provides more precise
 * truncation by accounting for the ellipsis length.
 * 
 * @param text - Text to truncate (can be null/undefined)
 * @param maxLength - Maximum length including ellipsis
 * @param ellipsis - String to show at the end of truncated text
 * @returns Truncated text with ellipsis or original text if no truncation needed
 * 
 * @example
 * ```tsx
 * truncateWithNullHandling(null, 10) // Returns ""
 * truncateWithNullHandling("Short", 10) // Returns "Short"
 * truncateWithNullHandling("Custom ellipsis", 10, "…") // Returns "Custom ell…"
 * ```
 * 
 * Used in:
 * - src/components/tasks/TaskDialog.tsx
 * - src/components/customers/CustomerDetailPage.tsx
 */
export function truncateWithNullHandling(text: string | null | undefined, maxLength: number, ellipsis: string = "..."): string {
  if (text === null || text === undefined) return "";
  if (text.length <= maxLength) return text;
  
  // The -1 ensures there's space for the ellipsis
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

// For backward compatibility, keep truncate as an alias
export const truncate = truncateWithNullHandling;

/**
 * Capitalizes the first letter of a string
 * 
 * @param text - The text to capitalize
 * @returns String with first letter capitalized
 * 
 * @example
 * ```tsx
 * capitalize("hello") // Returns "Hello"
 * capitalize("") // Returns ""
 * ```
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Slugifies a string (makes it URL-friendly)
 * 
 * @param text - The text to slugify
 * @returns URL-friendly slug string
 * 
 * @example
 * ```tsx
 * slugify("Hello World!") // Returns "hello-world"
 * slugify("Ελληνικά κείμενο") // Returns "ellinika-keimeno"
 * ```
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return "";
  
  return text
    .toString()
    .normalize('NFD')                // Normalize diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')      // Remove non-alphanumeric chars
    .replace(/\s+/g, '-');           // Replace spaces with hyphens
} 