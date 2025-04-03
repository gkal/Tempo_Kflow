import { supabase } from '@/lib/supabaseClient';
import * as fuzzball from 'fuzzball';

interface Customer {
  id: string;
  company_name: string;
  telephone: string;
  afm: string;
  doy?: string;
  email?: string;
  address?: string;
  town?: string;
  postal_code?: string;
  deleted?: boolean;
  score?: number;
}

// Simplified search input type
interface CustomerSearchInput {
  company_name: string;
  telephone: string;
  afm: string;
}

/**
 * Duplicate detection service for customers
 * Uses fuzzball.js for fuzzy string matching with token_sort_ratio
 * for company names with different word orders
 */

/**
 * Normalize Greek text by replacing accented characters with non-accented versions
 * @param text Text to normalize
 * @returns Normalized text
 */
const normalizeGreekText = (text: string): string => {
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
const normalizeAfm = (afm: string): string => {
  if (!afm) return '';
  
  // Keep only digits
  return afm.replace(/\D/g, '').trim();
};

/**
 * Normalize phone number by removing non-digits and handling Greek extensions
 * @param phone Phone number to normalize
 * @returns Normalized phone number with only digits (up to first Greek character)
 */
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Check if there's any Greek text (extensions like "εσ.201")
  // Greek Unicode ranges: \u0370-\u03FF for Greek and Coptic
  const greekExtensionMatch = phone.match(/[\u0370-\u03FF]/);
  
  if (greekExtensionMatch) {
    // If Greek characters exist, only take the part before them
    const greekIndex = greekExtensionMatch.index || 0;
    phone = phone.substring(0, greekIndex);
  }
  
  // Keep only digits
  return phone.replace(/\D/g, '').trim();
};

/**
 * Calculate similarity between two company names using fuzzball token_sort_ratio
 * This handles different word orders and partial matches effectively
 * @param name1 First company name
 * @param name2 Second company name to compare
 * @returns Similarity score 0-100
 */
const getNameSimilarity = (name1: string, name2: string): number => {
  if (!name1 || !name2) return 0;
  
  // Normalize and convert to lowercase
  name1 = normalizeGreekText(name1.toLowerCase().trim());
  name2 = normalizeGreekText(name2.toLowerCase().trim());
  
  if (name1 === name2) return 100;
  
  // Use token_sort_ratio from fuzzball for better company name matching
  // This handles different word orders effectively
  return fuzzball.token_sort_ratio(name1, name2);
};

/**
 * Compare phone numbers with improved matching for prefixes
 * @param phone1 First phone number
 * @param phone2 Second phone number to compare
 * @returns Similarity score 0-100
 */
const getPhoneSimilarity = (phone1: string, phone2: string): number => {
  if (!phone1 || !phone2) return 0;
  
  // Standardize phone numbers by removing non-digits and handling Greek extensions
  const standardized1 = normalizePhone(phone1);
  const standardized2 = normalizePhone(phone2);
  
  // If either is empty after normalization, return 0
  if (!standardized1 || !standardized2) return 0;
  
  // Exact match
  if (standardized1 === standardized2) return 100;
  
  // Check if one is a subset of the other (e.g., partial number)
  if (standardized1.includes(standardized2) || standardized2.includes(standardized1)) {
    return 80; // Increase from 70 to 80 to give more weight
  }
  
  // Check matching prefix - how many starting digits match
  let matchingDigits = 0;
  const minLength = Math.min(standardized1.length, standardized2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (standardized1[i] === standardized2[i]) {
      matchingDigits++;
    } else {
      break; // Stop at first non-matching digit
    }
  }
  
  // If at least 3 digits match at the beginning, return a proportional score
  if (matchingDigits >= 3) {
    // Calculate score based on how many digits match compared to the longer number
    const maxLength = Math.max(standardized1.length, standardized2.length);
    return Math.round((matchingDigits / maxLength) * 100);
  }
  
  return 0;
};

/**
 * Compare AFM (tax ID) for exact match
 * @param afm1 First AFM
 * @param afm2 Second AFM to compare
 * @returns 100 if exact match, 0 otherwise
 */
const getAfmSimilarity = (afm1: string, afm2: string): number => {
  if (!afm1 || !afm2) return 0;
  
  // Normalize to only digits
  const normalized1 = normalizeAfm(afm1);
  const normalized2 = normalizeAfm(afm2);
  
  return normalized1 === normalized2 ? 100 : 0;
};

/**
 * Calculate weighted similarity score between a search input and a customer
 * @param searchInput The customer being created/edited
 * @param customer Existing customer from database
 * @returns Weighted similarity score 0-100
 */
const calculateSimilarityScore = (
  searchInput: CustomerSearchInput,
  customer: Customer
): number => {
  // Calculate individual similarity scores
  const nameSimilarity = getNameSimilarity(
    searchInput.company_name || '',
    customer.company_name || ''
  );
  
  const phoneSimilarity = getPhoneSimilarity(
    searchInput.telephone || '',
    customer.telephone || ''
  );
  
  const afmSimilarity = getAfmSimilarity(
    searchInput.afm || '',
    customer.afm || ''
  );
  
  // Special case: Exact AFM match is a definite match regardless of other fields
  // AFM should be unique per customer in the database
  if (afmSimilarity === 100 && searchInput.afm && searchInput.afm.trim().length >= 3) {
    return 100; // Definite match - AFM should be unique per customer
  }
  
  // Special case: Exact phone match is a strong indicator regardless of name
  // This ensures phone-only matches show up even with different names
  if (phoneSimilarity === 100 && searchInput.telephone && searchInput.telephone.trim().length >= 3) {
    return 85; // High confidence match based on phone only
  }
  
  // Skip completely if no meaningful data to compare
  if (
    (!searchInput.company_name && !searchInput.telephone && !searchInput.afm) ||
    (!customer.company_name && !customer.telephone && !customer.afm)
  ) {
    return 0;
  }
  
  // Weighted calculation combining all fields
  // Weights based on relative importance:
  // - Company name: 40%
  // - Phone number: 40% 
  // - AFM (tax ID): 20%
  const nameWeight = 0.4;
  const phoneWeight = 0.4;
  const afmWeight = 0.2;
  
  let weightedScore = 0;
  let appliedWeight = 0;
  
  // Only apply weights for fields that have values to compare
  if (searchInput.company_name && customer.company_name) {
    weightedScore += nameSimilarity * nameWeight;
    appliedWeight += nameWeight;
  }
  
  if (searchInput.telephone && searchInput.telephone.trim() !== '' && customer.telephone) {
    weightedScore += phoneSimilarity * phoneWeight;
    appliedWeight += phoneWeight;
  }
  
  if (searchInput.afm && searchInput.afm.trim() !== '' && customer.afm) {
    weightedScore += afmSimilarity * afmWeight;
    appliedWeight += afmWeight;
  }
  
  // Normalize the score based on applied weights
  const normalizedScore = appliedWeight > 0 ? Math.round(weightedScore / appliedWeight) : 0;
  
  // Special boosts for multiple matches:
  
  // 1. If both name and phone are exact matches (100%), this is definitely the same customer
  if (nameSimilarity === 100 && phoneSimilarity === 100) {
    return 100;
  }
  
  // 2. If name is exact (100%) and phone is high (>=70%), or vice versa, boost to 95%
  if ((nameSimilarity === 100 && phoneSimilarity >= 70) || 
      (phoneSimilarity === 100 && nameSimilarity >= 70)) {
    return 95;
  }
  
  // 3. If both name and phone have high similarity (>=80%), boost to 90%
  if (nameSimilarity >= 80 && phoneSimilarity >= 80) {
    return 90;
  }
  
  return normalizedScore;
};

/**
 * Finds potential duplicate customers based on company name, phone, and AFM
 * @param searchInput Customer data to check for duplicates
 * @param threshold Minimum similarity score to consider as a duplicate (default: 70)
 * @returns Array of potential duplicate customers with similarity scores
 */
export const findPotentialDuplicates = async (
  searchInput: CustomerSearchInput,
  threshold: number = 70
): Promise<Customer[]> => {
  try {
    // Skip search if no meaningful data provided
    if (
      (!searchInput.company_name || searchInput.company_name.trim() === '') &&
      (!searchInput.telephone || searchInput.telephone.trim() === '') &&
      (!searchInput.afm || searchInput.afm.trim() === '')
    ) {
      return [];
    }
    
    // Using a try-catch approach to handle potential column-not-exist errors
    try {
      // First try with the 'deleted' column
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, deleted')
        .is('deleted_at', null);
      
      if (error) {
        // If there's an error, it might be because the deleted column doesn't exist
        console.error('Error with deleted column:', error);
        throw new Error('Column may not exist');
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Process data with deleted field
      return processCustomerData(data, searchInput, threshold);
    } catch (e) {
      // Try again with is_deleted column instead
      console.log('Trying with is_deleted column instead');
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, is_deleted')
        .is('deleted_at', null);
      
      if (error) {
        console.error('Error with is_deleted column:', error);
        
        // Last resort - try without any soft delete column
        const { data: allData, error: allError } = await supabase
          .from('customers')
          .select('id, company_name, telephone, afm, doy, email, address, town, postal_code')
          .is('deleted_at', null);
        
        if (allError || !allData) {
          console.error('Failed to fetch customers:', allError);
          return [];
        }
        
        return processCustomerData(allData, searchInput, threshold);
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Map is_deleted to deleted for consistency
      const mappedData = data.map(item => {
        const { is_deleted, ...rest } = item as any;
        return { ...rest, deleted: is_deleted };
      });
      
      return processCustomerData(mappedData, searchInput, threshold);
    }
  } catch (error) {
    console.error('Error in duplicate detection:', error);
    return [];
  }
};

/**
 * Process customer data from Supabase - separate function to avoid code duplication
 */
const processCustomerData = (
  customers: any[],
  searchInput: CustomerSearchInput,
  threshold: number
): Customer[] => {
  // Apply AFM exact matching filter when applicable
  if (searchInput.afm && searchInput.afm.trim() !== '') {
    customers = customers.filter(customer => 
      customer.afm === searchInput.afm.trim()
    );
  }
  
  if (customers.length === 0) {
    return [];
  }
  
  // Process results with similarity scoring
  const scoredCustomers = customers.map(customer => ({
    ...customer,
    score: calculateSimilarityScore(searchInput, customer)
  }));
  
  // Filter by threshold and sort by score (highest first)
  return scoredCustomers
    .filter(customer => (customer.score || 0) >= threshold)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
};

// Export the service
export default { findPotentialDuplicates }; 