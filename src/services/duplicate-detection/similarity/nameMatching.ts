import * as fuzzball from 'fuzzball';
import { normalizeGreekText } from '../normalizers';

/**
 * Compare company names with fuzzy matching
 * @param name1 First company name
 * @param name2 Second company name to compare
 * @returns Similarity score 0-100
 */
export const getNameSimilarity = (name1: string, name2: string): number => {
  if (!name1 || !name2) return 0;
  
  // Normalize Greek text (accents, case, etc.)
  const normalizedName1 = normalizeGreekText(name1.toLowerCase().trim());
  const normalizedName2 = normalizeGreekText(name2.toLowerCase().trim());
  
  // Check for exact matches first
  if (normalizedName1 === normalizedName2) {
    return 100; // Perfect match
  }
  
  // Check for prefix matches - particularly useful during typing
  if (normalizedName1.startsWith(normalizedName2) || normalizedName2.startsWith(normalizedName1)) {
    const minLength = Math.min(normalizedName1.length, normalizedName2.length);
    const maxLength = Math.max(normalizedName1.length, normalizedName2.length);
    
    // If the shorter string is at least 4 characters and makes up a significant portion of the longer string
    if (minLength >= 4 && (minLength / maxLength) >= 0.5) {
      // Score proportionally to how much of the full name is matched
      return Math.round(60 + ((minLength / maxLength) * 40));
    }
    
    // For shorter matches (2-3 chars), give a higher score if they're the beginning of a word
    if (minLength >= 2 && (minLength / maxLength) >= 0.15) {
      return Math.round(65 + ((minLength / maxLength) * 30));
    }
  }
  
  // Check for substring matches (partial words anywhere in the name)
  if (normalizedName1.includes(normalizedName2) || normalizedName2.includes(normalizedName1)) {
    const minLength = Math.min(normalizedName1.length, normalizedName2.length);
    const maxLength = Math.max(normalizedName1.length, normalizedName2.length);
    
    // For longer substrings (4+ chars)
    if (minLength >= 4) {
      return Math.round(65 + ((minLength / maxLength) * 30));
    }
    
    // For shorter substrings (2-3 chars)
    if (minLength >= 2) {
      return Math.round(65 + ((minLength / maxLength) * 15));
    }
  }
  
  // Fallback to fuzzy matching for non-prefix cases
  try {
    // Use token_sort_ratio for better handling of word order differences
    return fuzzball.token_sort_ratio(normalizedName1, normalizedName2);
  } catch (error) {
    console.error('Error in fuzzy matching:', error);
    return 0;
  }
}; 