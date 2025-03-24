/**
 * Formatting utility functions for dates, times, and other data
 * 
 * This module provides consistent formatting functions used across the application.
 * These utilities ensure a consistent presentation of data for users.
 * 
 * @module formatUtils
 */

import { logError } from './loggingUtils';

/**
 * Formats a date to dd/mm/yyyy in Greek locale
 * 
 * @param date - Date string or Date object
 * @returns Formatted date string or "-" if date is invalid
 * 
 * @example
 * ```tsx
 * // Format a date string
 * formatDate('2023-05-15') // Returns '15/05/2023'
 * 
 * // Format a Date object
 * formatDate(new Date()) // Returns current date in format '15/05/2023'
 * 
 * // Handle invalid date
 * formatDate(null) // Returns '-'
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomerDetailPage.tsx
 * - src/components/offers/OffersPage.tsx
 * - src/components/tasks/TasksPage.tsx
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    
    return d.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
}

/**
 * Formats a date and time to dd/mm/yyyy hh:mm:ss in Greek locale
 * 
 * @param date - Date string or Date object
 * @returns Formatted date and time string or "-" if date is invalid
 * 
 * @example
 * ```tsx
 * // Format a date string with time
 * formatDateTime('2023-05-15T14:30:00') // Returns '15/05/2023 14:30:00'
 * 
 * // Format current date and time
 * formatDateTime(new Date()) // Returns current date and time
 * 
 * // Handle invalid datetime
 * formatDateTime(null) // Returns '-'
 * ```
 * 
 * Used in:
 * - src/components/customers/CustomersPage.tsx
 * - src/components/ui/data-table-base.tsx
 * - src/components/settings/SettingsPage.tsx
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    
    const dateString = d.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    
    const timeString = d.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    
    return `${dateString} ${timeString}`;
  } catch (error) {
    console.error("Error formatting datetime:", error);
    return "-";
  }
}

/**
 * Safely formats a date and time, handling various formats and errors
 * 
 * This function extends formatDateTime with additional checks for
 * already formatted dates and error handling.
 * 
 * @param dateStr - Date string or Date object to format
 * @returns Formatted date and time string or "-" for invalid dates
 * 
 * @example
 * ```tsx
 * // Format a date that might already be formatted
 * safeFormatDateTime("05/06/2023 14:30:00 π.μ.") // Returns same string as already formatted
 * 
 * // Format an ISO date
 * safeFormatDateTime("2023-06-05T14:30:00") // Returns "05/06/2023 14:30:00"
 * 
 * // Handle invalid dates
 * safeFormatDateTime("invalid") // Returns "invalid" or "-"
 * ```
 * 
 * Used in:
 * - src/components/ui/data-table-base.tsx
 */
export function safeFormatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  
  try {
    // Handle already formatted dates
    if (typeof dateStr === 'string') {
      // Check if already in Greek format
      if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2} [πμ.]{4}$/.test(dateStr) || 
          /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        return dateStr;
      }
    }
    
    return formatDateTime(dateStr);
  } catch (error) {
    logError("Error safely formatting date", error, "formatUtils");
    return String(dateStr) || "-";
  }
}

/**
 * Formats a date without time to yyyy-mm-dd format
 * Useful for input[type="date"] values and API requests
 * 
 * @param date - Date string or Date object
 * @returns Formatted date string in yyyy-mm-dd format or empty string if invalid
 * 
 * @example
 * ```tsx
 * // Get today's date in ISO format
 * const today = formatDateISO(new Date());
 * 
 * // Use with date inputs
 * <input type="date" value={formatDateISO(selectedDate)} />
 * ```
 * 
 * Used in:
 * - src/components/offers/improved/OfferForm.tsx
 * - src/components/tasks/TaskForm.tsx
 */
export function formatDateISO(date: Date | string | null | undefined): string {
  if (!date) return "";
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    
    return d.toISOString().split('T')[0];
  } catch (error) {
    console.error("Error formatting ISO date:", error);
    return "";
  }
}

/**
 * Format a currency value with euro symbol
 * 
 * @param value - Number or numeric string to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string or "-" if invalid
 * 
 * @example
 * ```tsx
 * formatCurrency(1234.56) // Returns '1.234,56 €'
 * formatCurrency('1234.56') // Returns '1.234,56 €'
 * formatCurrency(1234.56, 0) // Returns '1.235 €'
 * ```
 * 
 * Used in:
 * - src/components/offers/OffersTable.tsx
 * - src/components/dashboard/MetricCards.tsx
 */
export function formatCurrency(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || value === '') return "-";
  
  try {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "-";
    
    return numValue.toLocaleString('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  } catch (error) {
    console.error("Error formatting currency:", error);
    return "-";
  }
}

/**
 * Format a phone number with specific Greek formats
 * 
 * This function formats phone numbers differently based on their first digit:
 * - Landline (starting with 2): xxx-xx.xx.xxx
 * - Mobile (starting with 6): xxxx-xx.xx.xx
 * - International (starting with +): Preserves format
 * - Other formats: Returns as-is
 * 
 * Also handles special cases:
 * - Preserves cursor position during editing
 * - Handles deletion operations (doesn't format when deleting)
 * - Preserves non-numeric characters in the input
 * 
 * @param value - The current phone number value to format
 * @param prevValue - The previous phone number value (needed for edit detection)
 * @param shouldFormat - Whether formatting should be applied (default: true)
 * @returns Formatted phone number
 * 
 * @example
 * // For landline numbers (start with 2)
 * formatPhoneNumber('2101234567', '') // Returns '210-12.34.567'
 * 
 * // For mobile numbers (start with 6)
 * formatPhoneNumber('6971234567', '') // Returns '6971-23.45.67'
 * 
 * // When deleting characters (current value shorter than previous)
 * formatPhoneNumber('697-1', '697-12') // Returns '697-1' (no formatting applied)
 * 
 * @usedIn src/hooks/usePhoneFormat.ts, src/components/customers/CustomerForm.tsx
 */
export function formatPhoneNumber(
  value: string,
  prevValue: string = "",
  shouldFormat: boolean = true
): string {
  // If formatting is disabled, return as is
  if (!shouldFormat) {
    return value;
  }

  // Check if user is deleting (current length < previous length)
  if (prevValue && value.length < prevValue.length) {
    return value;
  }
  
  // Handle international format with + sign
  if (value.startsWith('+')) {
    return value;
  }
  
  // For inputs not starting with 2 or 6, return the value as is
  if (!value.startsWith('2') && !value.startsWith('6')) {
    return value;
  }
  
  // Check if there's non-digit text at the end (e.g. ext.201)
  const nonFormatCharsMatch = /[^\d\-\.]/.exec(value);
  if (nonFormatCharsMatch) {
    const pos = nonFormatCharsMatch.index;
    
    // If we have non-digit characters and we're editing before them,
    // we need to be extra careful about formatting
    if (prevValue && 
        pos < value.length && 
        prevValue.substring(pos) === value.substring(pos + (value.length - prevValue.length))) {
      // We're editing in the digit portion, before the non-digit part
      // In this case, we shouldn't apply automatic formatting to avoid cursor issues
      return value;
    }
    
    const digitPart = value.substring(0, pos);
    const nonDigitPart = value.substring(pos);
    
    // Format only the digit part and keep the rest unchanged
    const formattedDigitPart = formatPhoneNumber(digitPart, "", shouldFormat);
    return formattedDigitPart + nonDigitPart;
  }
  
  // At this point, we're only dealing with digits and formatting characters
  const cleaned = value.replace(/[^\d]/g, '');
  
  try {
    // Don't format if too short
    if (cleaned.length < 3) {
      return value;
    }
    
    if (cleaned.startsWith('2')) {
      // Format for numbers starting with 2: xxx-xx.xx.xxx
      if (cleaned.length >= 3 && cleaned.length < 5) {
        return `${cleaned.substring(0, 3)}${cleaned.length > 3 ? '-' + cleaned.substring(3) : ''}`;
      } else if (cleaned.length >= 5 && cleaned.length < 7) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}${cleaned.length > 5 ? '.' + cleaned.substring(5) : ''}`;
      } else if (cleaned.length >= 7 && cleaned.length < 10) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}.${cleaned.substring(5, 7)}${cleaned.length > 7 ? '.' + cleaned.substring(7) : ''}`;
      } else if (cleaned.length >= 10) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}.${cleaned.substring(5, 7)}.${cleaned.substring(7, 10)}${cleaned.length > 10 ? cleaned.substring(10) : ''}`;
      }
    } else if (cleaned.startsWith('6')) {
      // Format for numbers starting with 6: xxxx-xx.xx.xx
      if (cleaned.length >= 4 && cleaned.length < 6) {
        return `${cleaned.substring(0, 4)}${cleaned.length > 4 ? '-' + cleaned.substring(4) : ''}`;
      } else if (cleaned.length >= 6 && cleaned.length < 8) {
        return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}${cleaned.length > 6 ? '.' + cleaned.substring(6) : ''}`;
      } else if (cleaned.length >= 8 && cleaned.length < 10) {
        return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}.${cleaned.substring(6, 8)}${cleaned.length > 8 ? '.' + cleaned.substring(8) : ''}`;
      } else if (cleaned.length >= 10) {
        return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}.${cleaned.substring(6, 8)}.${cleaned.substring(8, 10)}${cleaned.length > 10 ? cleaned.substring(10) : ''}`;
      }
    }
  } catch (error) {
    logError("Error formatting phone number:", error, "formatUtils");
  }
  
  // If we get here, just return the input value (fallback)
  return value;
}

/**
 * Interface for date parts extracted from a date string
 */
export interface DateParts {
  /** The year (YYYY format) */
  year: string;
  /** The month (MM format) */
  month: string;
  /** The day (DD format) */
  day: string;
  /** The original date string */
  full: string;
}

/**
 * Extracts the year, month, and day parts from a date string
 * 
 * Supports multiple date formats:
 * - Greek format (DD/MM/YYYY)
 * - ISO format (YYYY-MM-DD)
 * - Any format parsable by Date constructor
 * 
 * @param dateStr - Date string to parse
 * @returns Object containing year, month, day parts and the full original string
 * 
 * @example
 * ```tsx
 * // Extract from Greek format
 * extractDateParts("25/12/2023") 
 * // Returns { year: "2023", month: "12", day: "25", full: "25/12/2023" }
 * 
 * // Extract from ISO format
 * extractDateParts("2023-12-25") 
 * // Returns { year: "2023", month: "12", day: "25", full: "2023-12-25" }
 * ```
 * 
 * Used in:
 * - src/components/ui/data-table-base.tsx for date-based sorting
 */
export function extractDateParts(dateStr: string | null | undefined): DateParts {
  const defaultResult: DateParts = { year: '0000', month: '00', day: '00', full: '' };
  
  if (!dateStr) return defaultResult;
  
  try {
    // For dates in Greek format (DD/MM/YYYY)
    const greekFormatMatch = String(dateStr).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (greekFormatMatch) {
      return {
        day: greekFormatMatch[1],
        month: greekFormatMatch[2],
        year: greekFormatMatch[3],
        full: String(dateStr)
      };
    }
    
    // For ISO format dates (YYYY-MM-DD)
    const isoMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return {
        year: isoMatch[1],
        month: isoMatch[2],
        day: isoMatch[3],
        full: String(dateStr)
      };
    }
    
    // Try parsing as a date object
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return {
        year: date.getFullYear().toString(),
        month: (date.getMonth() + 1).toString().padStart(2, '0'),
        day: date.getDate().toString().padStart(2, '0'),
        full: String(dateStr)
      };
    }
    
    return { ...defaultResult, full: String(dateStr) };
  } catch (error) {
    logError("Error extracting date parts", error, "formatUtils");
    return defaultResult;
  }
} 