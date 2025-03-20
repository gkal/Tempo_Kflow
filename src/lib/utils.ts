import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to dd/mm/yyyy
export function formatDate(date: string | Date): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Format datetime to dd/mm/yyyy hh:mm:ss
export function formatDateTime(date: string | Date): string {
  if (!date) return "-";
  const d = new Date(date);
  return (
    d.toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  );
}

/**
 * Formats a phone number according to:
 * - xxx-xx.xx.xxx pattern when starting with 2
 * - xxxx-xx.xx.xx pattern when starting with 6
 * - No formatting for other cases (any other digits, characters, or symbols)
 * - Preserves + sign for international numbers
 * - After the initial formatting, allows free-form editing including any characters
 * 
 * Also applies specific conditions:
 * 1. No formatting is applied if the input doesn't start with digit 2 or 6
 * 2. If the user is deleting characters, no formatting is applied
 * 3. If editing in the middle of a formatted number, format is maintained without moving digits
 */
export function formatPhoneNumber(
  value: string,
  prevValue: string,
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
  
  // HANDLE NON-FORMATTING CHARACTERS
  // 1. If we're adding a character that isn't a digit, - or . to the end, just return the value
  if (prevValue && 
      value.length === prevValue.length + 1 && 
      !/[\d\-\.]/.test(value[value.length - 1])) {
    return value;
  }
  
  // 2. If we've entered non-digit characters (excluding formatting chars) 
  //    and we're just adding to the end, don't format
  if (prevValue && 
      /[^\d\-\.]/.test(prevValue) &&
      value.startsWith(prevValue)) {
    return value;
  }
  
  // Check if we're editing in the middle of the input
  // If the change isn't just adding to the end, and the length didn't decrease (not deleting)
  // This indicates we're editing somewhere in the middle of the input
  if (prevValue && 
      value.length > prevValue.length && 
      !value.startsWith(prevValue)) {
    // Find where the difference starts
    let diffIndex = 0;
    while (diffIndex < prevValue.length && prevValue[diffIndex] === value[diffIndex]) {
      diffIndex++;
    }
    
    // If we're editing in the middle and could cause formatting to shift, 
    // return the value as-is to prevent cursor position issues
    return value;
  }
  
  // At this point, we're only dealing with digits and formatting characters
  // and we're either typing at the end or starting from scratch
  // Extract just the digits for formatting
  const digits = value.replace(/\D/g, '');
  const firstDigit = digits.charAt(0);
  let formattedNumber = '';
  
  if (firstDigit === '2') {
    // Format for numbers starting with 2: xxx-xx.xx.xxx
    if (digits.length <= 3) {
      formattedNumber = digits;
    } else if (digits.length <= 5) {
      formattedNumber = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else if (digits.length <= 7) {
      formattedNumber = `${digits.slice(0, 3)}-${digits.slice(3, 5)}.${digits.slice(5)}`;
    } else {
      formattedNumber = `${digits.slice(0, 3)}-${digits.slice(3, 5)}.${digits.slice(5, 7)}.${digits.slice(7)}`;
    }
  } else if (firstDigit === '6') {
    // Format for numbers starting with 6: xxxx-xx.xx.xx
    if (digits.length <= 4) {
      formattedNumber = digits;
    } else if (digits.length <= 6) {
      formattedNumber = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else if (digits.length <= 8) {
      formattedNumber = `${digits.slice(0, 4)}-${digits.slice(4, 6)}.${digits.slice(6)}`;
    } else {
      formattedNumber = `${digits.slice(0, 4)}-${digits.slice(4, 6)}.${digits.slice(6, 8)}.${digits.slice(8)}`;
    }
  }
  
  return formattedNumber;
}

// Truncate text to a certain length
export function truncate(text: string, length: number) {
  if (!text) return "";
  return text.length > length ? text.substring(0, length) + "..." : text;
}
