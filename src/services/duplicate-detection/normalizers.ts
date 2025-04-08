/**
 * Utility functions for normalizing text inputs in duplicate detection
 */

/**
 * Normalize Greek text by replacing accented characters with non-accented versions
 * @param text Text to normalize
 * @returns Normalized text
 */
export const normalizeGreekText = (text: string): string => {
  if (!text) return '';
  
  // Map of Greek accented characters to their non-accented versions
  const accentMap: { [key: string]: string } = {
    'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ϊ': 'ι', 'ΐ': 'ι',
    'ό': 'ο', 'ύ': 'υ', 'ϋ': 'υ', 'ΰ': 'υ', 'ώ': 'ω',
    'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ϊ': 'Ι',
    'Ό': 'Ο', 'Ύ': 'Υ', 'Ϋ': 'Υ', 'Ώ': 'Ω'
  };
  
  // Replace each accented character with its non-accented version
  return text.split('').map(char => accentMap[char] || char).join('');
};

/**
 * Normalize AFM (tax ID) by keeping only digits
 * @param afm AFM to normalize
 * @returns Normalized AFM with only digits
 */
export const normalizeAfm = (afm: string): string => {
  if (!afm) return '';
  return afm.replace(/\D/g, '').trim();
};

/**
 * Normalize phone numbers for consistent comparison
 * @param phone Raw phone number
 * @returns Standardized phone number
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Extract digits - this is our base normalized form for comparison
  const digits = phone.replace(/\D/g, '');
  
  // For very short inputs (like when user is typing), just return all digits
  // This ensures we don't lose matches as user continues typing
  if (digits.length <= 6) {
    return digits;
  }
  
  // Format preservation - we'll keep track of the format for specific patterns
  // For example: 6983-50.50.43 has a specific format we might want to preserve
  
  // Check if the input has a special format with separators
  const hasFormatting = phone.includes('-') || phone.includes('.') || 
                     phone.includes(' ') || phone.includes('/');
  
  // Special case: Greek mobile numbers - ensure standard 10-digit format
  if (digits.startsWith('69') && digits.length >= 10) {
    const normalizedMobile = digits.substring(0, 10);
    return normalizedMobile;
  }
  
  // Special case: Greek landline numbers with area code
  if (digits.startsWith('2') && digits.length >= 10) {
    const normalizedLandline = digits.substring(0, 10);
    return normalizedLandline;
  }
  
  // Special case: International format (e.g. +30 prefix for Greece)
  if (digits.startsWith('30') && digits.length > 10) {
    const normalizedIntl = digits.substring(2); // Remove country code
    return normalizedIntl;
  }
  
  // Special case: Phone with specific format like 6983-50.50.43
  // For these, we want to preserve this format for formatted searches
  if (hasFormatting && (
      phone.match(/^[0-9]{4}-[0-9]{2}\.[0-9]{2}\.[0-9]{2}$/) || // 6983-50.50.43
      phone.match(/^[0-9]{4}-[0-9]{2}\.?[0-9]{2}$/) // 6983-50.50 or 6983-5050
  )) {
    // We still return digits for consistency, but the calling function
    // should be aware to also try the original format
    return digits;
  }
  
  // For any other case, just return all digits
  return digits;
}; 