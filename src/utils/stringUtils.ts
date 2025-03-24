/**
 * String utility functions for text manipulation and formatting
 * 
 * This module provides functions for handling string operations such as 
 * trimming, slug creation, capitalization, and text truncation.
 * 
 * @module stringUtils
 */

/**
 * Truncates a string to a specified length and adds an ellipsis if needed
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - String to append when truncated (default: "...")
 * @returns Truncated text with ellipsis or original text if shorter than maxLength
 * 
 * @example
 * ```tsx
 * // Truncate a long string
 * truncateText("This is a very long text that needs truncation", 20)
 * // Returns "This is a very long..."
 * 
 * // No truncation needed
 * truncateText("Short text", 20)
 * // Returns "Short text"
 * 
 * // Custom ellipsis
 * truncateText("This needs truncation", 10, " [more]")
 * // Returns "This needs [more]"
 * ```
 * 
 * Used in:
 * - src/components/ui/truncated-text.tsx
 * - src/components/customers/CustomersPage.tsx
 */
export function truncateText(text: string, maxLength: number, ellipsis: string = "..."): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  
  return text.slice(0, maxLength) + ellipsis;
}

/**
 * Alias for truncateText to maintain backward compatibility with lib/utils.ts
 * 
 * @param text - Text to truncate
 * @param length - Maximum length before truncation
 * @returns Truncated text with ellipsis or original text if no truncation needed
 * 
 * @deprecated Use truncateText instead for more options
 */
export function truncate(text: string, length: number): string {
  return truncateText(text, length);
}

/**
 * Generates a URL-friendly slug from a string
 * 
 * @param text - Text to convert to a slug
 * @returns URL-friendly slug with hyphens
 * 
 * @example
 * ```tsx
 * // Generate a slug for a company name
 * generateSlug("Acme Corporation Ltd")
 * // Returns "acme-corporation-ltd"
 * 
 * // Handle special characters
 * generateSlug("Company (2023)")
 * // Returns "company-2023"
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerForm.tsx
 * - src/lib/routeUtils.ts
 */
export function generateSlug(text: string): string {
  if (!text) return "";
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Capitalizes the first letter of each word in a string
 * 
 * @param text - Text to capitalize
 * @returns Text with first letter of each word capitalized
 * 
 * @example
 * ```tsx
 * // Capitalize a company name
 * capitalizeWords("acme corporation")
 * // Returns "Acme Corporation"
 * 
 * // Handle multiple spaces
 * capitalizeWords("first  second")
 * // Returns "First  Second"
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/ui/custom-dropdown.tsx
 */
export function capitalizeWords(text: string): string {
  if (!text) return "";
  
  return text
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalizes a string by removing accents and converting to lowercase
 * Useful for case-insensitive and accent-insensitive search
 * 
 * @param text - Text to normalize
 * @returns Normalized text without accents in lowercase
 * 
 * @example
 * ```tsx
 * // Remove accents from Greek text
 * normalizeText("Ελληνικά")
 * // Returns "ελληνικα"
 * 
 * // Use for search matching
 * const searchTerm = normalizeText("Αθήνα");
 * const isMatch = normalizeText("ΑΘΗΝΑ").includes(searchTerm); // true
 * ```
 * 
 * Used in:
 * - src/components/ui/search-bar.tsx
 * - src/components/customers/CustomersPage.tsx
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  
  return text
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, ""); // Remove accent marks
}

/**
 * Extracts the initials from a name
 * Takes the first letter of each word, up to 2 letters
 * 
 * @param name - Full name to extract initials from
 * @param maxLength - Maximum number of initials (default: 2)
 * @returns Uppercase initials
 * 
 * @example
 * ```tsx
 * // Get initials from a full name
 * getInitials("John Doe")
 * // Returns "JD"
 * 
 * // Get initials from a longer name (limited to 2 by default)
 * getInitials("John Paul Smith")
 * // Returns "JP"
 * 
 * // Get more initials
 * getInitials("John Paul Smith", 3)
 * // Returns "JPS"
 * ```
 * 
 * Used in:
 * - src/components/ui/avatar.tsx
 * - src/components/customers/CustomerDetailPage.tsx
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) return "";
  
  return name
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word[0].toUpperCase())
    .slice(0, maxLength)
    .join("");
} 