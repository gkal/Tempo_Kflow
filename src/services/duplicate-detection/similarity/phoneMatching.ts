import { normalizePhone } from '../normalizers';

/**
 * Compare phone numbers with improved matching for prefixes
 * @param phone1 First phone number
 * @param phone2 Second phone number to compare
 * @returns Similarity score 0-100
 */
export const getPhoneSimilarity = (phone1: string, phone2: string): number => {
  if (!phone1 || !phone2) return 0;
  
  // Standardize phone numbers
  const standardized1 = normalizePhone(phone1);
  const standardized2 = normalizePhone(phone2);
  
  // If either is empty after normalization, return 0
  if (!standardized1 || !standardized2) return 0;
  
  // Exact match
  if (standardized1 === standardized2) return 100;
  
  // Check if one is contained within the other (partial match)
  if (standardized1.includes(standardized2) || standardized2.includes(standardized1)) {
    const minLength = Math.min(standardized1.length, standardized2.length);
    
    // For 7+ digits matching - high confidence
    if (minLength >= 7) {
      return Math.min(80 + (minLength - 7) * 5, 95);
    }
    
    // For 5-6 digits matching - medium-high confidence
    if (minLength >= 5) {
      return 70 + ((minLength - 5) * 5); 
    }
    
    // For fewer than 5 digits - scale confidence based on length
    if (minLength === 4) return 40;
    if (minLength === 3) return 30;
    
    // For 1-2 digits, very low confidence
    return minLength * 10;
  }
  
  // Check matching prefix - how many starting digits match
  let matchingDigits = 0;
  const minLength = Math.min(standardized1.length, standardized2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (standardized1[i] === standardized2[i]) {
      matchingDigits++;
    } else {
      break;
    }
  }
  
  // If at least 3 digits match at the beginning, return a proportional score
  if (matchingDigits >= 3) {
    // For 7+ digits matching prefix - high confidence
    if (matchingDigits >= 7) {
      return 70 + ((matchingDigits - 7) * 10); // 70-100% for 7-10 digits
    }
    
    // For 5-6 digits matching prefix - medium-high confidence
    if (matchingDigits >= 5) {
      return 50 + ((matchingDigits - 5) * 10); // 50-60% for 5-6 digits
    }
    
    // For 3-4 digits matching prefix - medium confidence
    return 30 + ((matchingDigits - 3) * 10); // 30-40% for 3-4 digits
  }
  
  return 0; // No significant match
}; 