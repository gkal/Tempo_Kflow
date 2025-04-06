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
 * Normalize phone numbers for consistent comparison
 * @param phone Raw phone number
 * @returns Standardized phone number
 */
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Using the simplest approach: just extract digits
  const digits = phone.replace(/\D/g, '');
  

  
  // Special case: Greek mobile numbers - ensure standard 10-digit format
  // If it's a Greek mobile starting with 69, make sure it has 10 digits
  if (digits.startsWith('69') && digits.length >= 10) {
    return digits.substring(0, 10); // Take only first 10 digits for consistency
  }
  
  return digits;
};

/**
 * Compare company names with fuzzy matching
 * @param name1 First company name
 * @param name2 Second company name to compare
 * @returns Similarity score 0-100
 */
const getNameSimilarity = (name1: string, name2: string): number => {
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
    // Especially useful for autocomplete scenarios
    if (minLength >= 2 && (minLength / maxLength) >= 0.15) {
      // Increased base score from 50 to 65 to ensure it passes the threshold
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
    
    // For shorter substrings (2-3 chars), give a score that exceeds the threshold
    if (minLength >= 2) {
      // Increased base score to get over the 65% threshold
      return Math.round(65 + ((minLength / maxLength) * 15));
    }
  }
  
  // Fallback to fuzzy matching for non-prefix cases
  try {
    // Use token_sort_ratio for better handling of word order differences
    // This will match "Company Inc" with "Inc Company"
    const similarity = fuzzball.token_sort_ratio(normalizedName1, normalizedName2);
    

    
    return similarity;
  } catch (error) {
    console.error('Error in fuzzy matching:', error);
    return 0;
  }
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
  
  // For debugging
  if (standardized1.startsWith('6983') || standardized2.startsWith('6983')) {
    console.log(`Phone comparison: '${standardized1}' vs '${standardized2}'`);
  }
  
  // If either is empty after normalization, return 0
  if (!standardized1 || !standardized2) return 0;
  
  // Exact match
  if (standardized1 === standardized2) return 100;
  
  // Check if one is contained within the other (partial match)
  if (standardized1.includes(standardized2) || standardized2.includes(standardized1)) {
    const minLength = Math.min(standardized1.length, standardized2.length);
    const maxLength = Math.max(standardized1.length, standardized2.length);
    
    // Debug log
    if (standardized1.startsWith('6983') || standardized2.startsWith('6983')) {
      console.log(`Substring phone match: ${minLength} digits of ${maxLength} total`);
    }
    
    // Give higher scores for more matching digits
    // For 7+ digits matching - high confidence (mobile numbers in Greece are typically 10 digits)
    if (minLength >= 7) {
      // Give a very high score (80-95) for significant partial matches
      return Math.min(80 + (minLength - 7) * 5, 95);
    }
    
    // For 5-6 digits matching - medium-high confidence
    if (minLength >= 5) {
      // Increased score from 60-65 to 70-75 for better matching
      return 70 + ((minLength - 5) * 5); 
    }
    
    // For fewer than 5 digits - scale confidence based on length
    // Starting with 40% for 4 digits
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
      break; // Stop at first non-matching digit
    }
  }
  
  // Debug log
  if (standardized1.startsWith('6983') || standardized2.startsWith('6983')) {
    console.log(`Prefix phone match: ${matchingDigits} matching digits at start`);
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
  
  // Use our helper function to avoid code duplication
  return calculateSimilarityScoreWithFields(
    nameSimilarity,
    phoneSimilarity,
    afmSimilarity,
    searchInput
  );
};

/**
 * Find potential duplicate customers based on fuzzy matching
 * @param searchInput Object containing company_name, telephone, and afm
 * @param threshold Minimum similarity score threshold (0-100)
 * @returns Array of potential duplicate customers with similarity scores
 */
export const findPotentialDuplicates = async (
  searchInput: CustomerSearchInput,
  threshold: number = 65 // Increased default threshold from 40% to 65%
): Promise<Customer[]> => {
  try {
    // Skip search if all required fields are empty
    if (
      (!searchInput.company_name || searchInput.company_name.trim() === '') &&
      (!searchInput.telephone || searchInput.telephone.trim() === '') &&
      (!searchInput.afm || searchInput.afm.trim() === '')
    ) {
      return [];
    }
    
    // Clean and prepare search terms
    const cleanSearchInput = {
      company_name: searchInput.company_name?.trim() || '',
      telephone: searchInput.telephone?.trim().replace(/\D/g, '') || '',
      afm: searchInput.afm?.trim() || ''
    };
    
    // Check if we have valid search terms
    const hasCompanyName = cleanSearchInput.company_name.length >= 3;
    const hasPhoneNumber = cleanSearchInput.telephone.length >= 5;
    // Only consider AFM if it's a complete AFM (8 digits)
    const hasCompleteAFM = cleanSearchInput.afm.length === 8;
    
    // IMPORTANT: If we're doing a phone-only search, only search by phone
    if (hasPhoneNumber && !hasCompanyName && !hasCompleteAFM) {
      // Phone-only search
      
      try {
        const phoneDigits = cleanSearchInput.telephone;
        console.log(`Searching for phone containing: ${phoneDigits}`);
        
        // Simple query for phone-only search
        const { data, error } = await supabase
          .from('customers')
          .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, deleted')
          .ilike('telephone', `%${phoneDigits}%`)
          .is('deleted_at', null);
          
        if (error) {
          console.error('Phone-only search error:', error);
          return [];
        }
        
        if (!data || data.length === 0) {
          return [];
        }
        

        
        // Map results and process them
        const mappedData = data.map(item => {
          const { is_deleted, ...rest } = item as any;
          return { ...rest, deleted: is_deleted };
        });
        
        return processCustomerData(mappedData, cleanSearchInput, threshold);
      } catch (e) {
        console.error('Phone-only search error:', e);
        return [];
      }
    }
    
    // Continue with normal search for other cases
    // Build database query with filters to improve performance
    let customerResults: Customer[] = [];
    
    // 1. Handle exact AFM match if provided (highest priority)
    // Only search by AFM if it's a complete 9-digit AFM
    if (hasCompleteAFM) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, deleted')
          .eq('afm', cleanSearchInput.afm)
          .is('deleted_at', null);
          
        if (!error && data && data.length > 0) {
          const mappedData = data.map(item => {
            const { is_deleted, ...rest } = item as any;
            return { ...rest, deleted: is_deleted };
          });
          
          customerResults = [...customerResults, ...mappedData];
        }
      } catch (e) {
        console.error('AFM search error:', e);
      }
    }
    
    // 2. Handle phone search independently - always perform if phone number is provided
    if (hasPhoneNumber) {
      try {
        const phoneDigits = cleanSearchInput.telephone;
        console.log(`Searching for phone containing: ${phoneDigits}`);
        
        const { data, error } = await supabase
          .from('customers')
          .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, deleted')
          .ilike('telephone', `%${phoneDigits}%`)
          .is('deleted_at', null);
          
        if (!error && data && data.length > 0) {

          
          const mappedData = data.map(item => {
            const { is_deleted, ...rest } = item as any;
            return { ...rest, deleted: is_deleted };
          });
          
          // Add only unique results that aren't already in the customerResults array
          const uniquePhoneResults = mappedData.filter(item => 
            !customerResults.some(existing => existing.id === item.id)
          );
          
          customerResults = [...customerResults, ...uniquePhoneResults];
        } else if (error) {
          console.error('Phone search error:', error);
        }
      } catch (e) {
        console.error('Phone search error:', e);
      }
    }
    
    // 3. Handle company name search independently
    if (hasCompanyName) {
      try {
        // For multi-word search, we need to build a complex query
        // Split the company name into words and search for each
        const words = cleanSearchInput.company_name
          .split(/\s+/)
          .filter(word => word.length >= 2); // Only words with 2+ chars
        
        // First, try to find an exact match (case insensitive)
        let exactMatchQuery = supabase
          .from('customers')
          .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, deleted')
          .is('deleted_at', null)
          .ilike('company_name', cleanSearchInput.company_name.trim());
          
        const exactMatchResult = await exactMatchQuery;
        
        // If we found exact matches, add them to results but continue with fuzzy search
        if (!exactMatchResult.error && exactMatchResult.data && exactMatchResult.data.length > 0) {
          const mappedExactMatches = exactMatchResult.data.map(item => {
            const { is_deleted, ...rest } = item as any;
            return { ...rest, deleted: is_deleted };
          });
          
          // Add exact matches to results
          customerResults = [...customerResults, ...mappedExactMatches];
        }
        
        // If no exact matches, proceed with fuzzy search
        let query = supabase
          .from('customers')
          .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, deleted')
          .is('deleted_at', null);
        
        if (words.length === 1) {
          // Single word search
          query = query.ilike('company_name', `%${words[0]}%`);
        } 
        else if (words.length > 1) {
          // Multi-word search - find records containing ALL words in any order
          words.forEach(word => {
            query = query.ilike('company_name', `%${word}%`);
          });
        }
        
        const { data, error } = await query;
        
        if (!error && data && data.length > 0) {
          const mappedData = data.map(item => {
            const { is_deleted, ...rest } = item as any;
            return { ...rest, deleted: is_deleted };
          });
          
          // Add only unique results that aren't already in the customerResults array
          const uniqueNameResults = mappedData.filter(item => 
            !customerResults.some(existing => existing.id === item.id)
          );
          
          customerResults = [...customerResults, ...uniqueNameResults];
        }
      } catch (e) {
        console.error('Name search error:', e);
      }
    }
    
    // If we found no results with any search, return empty array
    if (customerResults.length === 0) {
      return [];
    }
    
    // Process all results through similarity scoring and filtering
    return processCustomerData(customerResults, cleanSearchInput, threshold);
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
  // Only filter by AFM if it's a complete 8-digit AFM
  const cleanedAFM = searchInput.afm?.trim().replace(/\D/g, '') || '';
  if (cleanedAFM.length === 8) {
    // This is a secondary filter in case the database query wasn't exact
    customers = customers.filter(customer => {
      const customerAFM = (customer.afm || '').replace(/\D/g, '');
      return customerAFM === cleanedAFM;
    });
  }

  if (customers.length === 0) {
    return [];
  }


  
  // Process results with similarity scoring
  const scoredCustomers = customers.map(customer => {
    // Calculate similarities once to avoid duplication
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
    
    // Calculate total score - using our new fields to avoid recalculating
    const score = calculateSimilarityScoreWithFields(
      nameSimilarity, 
      phoneSimilarity, 
      afmSimilarity, 
      searchInput
    );
    

    

    
    return {
      ...customer,
      score,
      matchReasons: {
        companyName: nameSimilarity >= 50,
        telephone: phoneSimilarity >= 50,
        afm: afmSimilarity >= 80
      }
    };
  });


  

  
  // Filter by threshold and sort by score (highest first)
  const results = scoredCustomers
    .filter(customer => (customer.score || 0) >= threshold)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  

  return results;
};

/**
 * Helper function to calculate similarity score with pre-calculated similarity values
 * This avoids duplicate calculations between calculateSimilarityScore and processCustomerData
 */
const calculateSimilarityScoreWithFields = (
  nameSimilarity: number,
  phoneSimilarity: number,
  afmSimilarity: number,
  searchInput: CustomerSearchInput
): number => {
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
  
  // Special case: High phone similarity (70%+) should be prioritized for phone-only searches
  // This helps when searching with just a few digits of a phone number
  const hasOnlyPhone = (
    (!searchInput.company_name || searchInput.company_name.trim() === '') &&
    (searchInput.telephone && searchInput.telephone.trim() !== '') &&
    (!searchInput.afm || searchInput.afm.trim() === '')
  );
  
  if (hasOnlyPhone && phoneSimilarity >= 70) {
    // Scale based on the phone similarity, but ensure it's at least 60%
    // to make these results visible to the user
    return Math.max(60, phoneSimilarity);
  }
  
  // Special case: Even medium phone similarity (40%+) should be returned for
  // short phone-only searches (4-5 digits) to make results visible
  if (hasOnlyPhone && 
      phoneSimilarity >= 40 && 
      searchInput.telephone.trim().replace(/\D/g, '').length <= 5) {
    // Return a score just above threshold to ensure visibility
    return Math.max(40, phoneSimilarity);
  }
  
  // Skip completely if no meaningful data to compare
  if (
    (!searchInput.company_name && !searchInput.telephone && !searchInput.afm)
  ) {
    return 0;
  }
  
  // Weighted calculation combining all fields
  // Adjust weights based on what data is available:
  let nameWeight = 0.4;  // Default: 40%
  let phoneWeight = 0.4; // Default: 40%
  let afmWeight = 0.2;   // Default: 20%
  
  // If only phone, give it 100% weight
  if (hasOnlyPhone) {
    nameWeight = 0;
    phoneWeight = 1.0;
    afmWeight = 0;
  }
  // If only company name, give it 100% weight
  else if (searchInput.company_name && 
           searchInput.company_name.trim() !== '' &&
           (!searchInput.telephone || searchInput.telephone.trim() === '') &&
           (!searchInput.afm || searchInput.afm.trim() === '')) {
    nameWeight = 1.0;
    phoneWeight = 0;
    afmWeight = 0;
  }
  
  let weightedScore = 0;
  let appliedWeight = 0;
  
  // Only apply weights for fields that have values to compare
  if (searchInput.company_name && searchInput.company_name.trim() !== '') {
    weightedScore += nameSimilarity * nameWeight;
    appliedWeight += nameWeight;
  }
  
  if (searchInput.telephone && searchInput.telephone.trim() !== '') {
    weightedScore += phoneSimilarity * phoneWeight;
    appliedWeight += phoneWeight;
  }
  
  if (searchInput.afm && searchInput.afm.trim() !== '') {
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
 * Find customers with phone numbers matching the search input and calculate combined scores
 * with both name and phone similarity
 * @param phone Phone number to search for
 * @param companyName Optional company name to include in scoring
 * @returns Promise<Customer[]> Array of matching customers with combined scores
 */
const findExactPhoneMatches = async (phone: string, companyName?: string): Promise<Customer[]> => {
  if (!phone || phone.trim() === '') return [];

  try {
    // Clean the phone number by removing non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 0) return [];
    

    
    // Create a pattern with wildcards between each digit
    const likePattern = cleanPhone.split('').join('%');
    
    // Use server-side filtering with LIKE patterns
    const { data: matches, error } = await supabase
      .from('customers')
      .select('id, company_name, telephone, afm, doy, email, address, town, postal_code, deleted_at')
      .or(`telephone.ilike.%${cleanPhone}%, telephone.ilike.%${likePattern}%`)
      .order('company_name');

    if (error) {
      console.error('Error in findExactPhoneMatches:', error);
      return [];
    }

    if (!matches || !Array.isArray(matches)) {
      console.error('Invalid response format in findExactPhoneMatches');
      return [];
    }

    // Calculate phone match score based on how much of the search phone is matched
    const calculatePhoneScore = (customerPhone: string) => {
      if (!customerPhone) return 0;
      const cleanCustomerPhone = customerPhone.replace(/\D/g, '');
      
      // Perfect match - both numbers are identical
      if (cleanCustomerPhone === cleanPhone) {
        return 100;
      }
      
      // Calculate what percentage of the search phone is contained in the customer phone
      if (cleanCustomerPhone.includes(cleanPhone)) {
        // Phone is fully contained - calculate score based on how much of the full number it represents
        // Cap at 85 to ensure only exact matches get 100
        return Math.min(85, Math.round((cleanPhone.length / cleanCustomerPhone.length) * 100));
      }
      
      // Partial match - calculate longest common substring
      let maxCommonLength = 0;
      for (let i = 0; i < cleanPhone.length; i++) {
        for (let j = i + 1; j <= cleanPhone.length; j++) {
          const substring = cleanPhone.substring(i, j);
          if (cleanCustomerPhone.includes(substring) && substring.length > maxCommonLength) {
            maxCommonLength = substring.length;
          }
        }
      }
      
      // Cap partial matches at 75 to ensure they don't score too high
      return Math.min(75, Math.round((maxCommonLength / cleanPhone.length) * 100));
    };
    
    return matches.map(customer => {
      // Calculate phone match score
      const phoneScore = calculatePhoneScore(customer.telephone);
      
      // Calculate name match score if company name is provided
      let nameScore = 0;
      let combinedScore = phoneScore;
      
      if (companyName && companyName.trim() !== '') {
        nameScore = getNameSimilarity(companyName, customer.company_name);
        
        // Calculate weighted average - phone matches are slightly more important
        // Only give 100% if both scores are 100%
        combinedScore = Math.round((phoneScore * 0.6) + (nameScore * 0.4));
        
        // Small boost if both scores are good, but cap at 95 unless both are perfect
        if (phoneScore > 70 && nameScore > 70) {
          const maxBoost = (phoneScore === 100 && nameScore === 100) ? 100 : 95;
          combinedScore = Math.min(maxBoost, combinedScore + 5);
        }
      }
      

      
      return {
        ...customer,
        deleted: customer.deleted_at !== null,
        score: combinedScore,
        matchReasons: {
          telephone: true,
          companyName: nameScore > 50,
          afm: false
        }
      };
    }).sort((a, b) => b.score - a.score); // Sort by score descending

  } catch (error) {
    console.error('Error in findExactPhoneMatches:', error);
    return [];
  }
};

// Export the service
export default { findPotentialDuplicates, findExactPhoneMatches }; 