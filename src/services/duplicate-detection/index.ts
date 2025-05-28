import { supabase } from '@/lib/supabaseClient';
import { normalizePhone, normalizeAfm } from './normalizers'; // Corrected path & removed non-exported members
import { getNameSimilarity } from './similarity/nameMatching'; // Corrected function name
import { getPhoneSimilarity } from './similarity/phoneMatching'; // Corrected function name
import { Customer, CustomerSearchInput } from './types'; // Removed ScoredCustomer as it's not exported from types.ts
// fuzzball is used in nameMatching.ts, not directly here unless specifically needed.

/**
 * Calculate match scores for each customer based on both phone and company name similarity
 * @param customers List of customers to score
 * @param searchInput Search criteria
 * @param companyName Company name (for phone search)
 * @returns Sorted list of scored customers
 */
const calculateCustomerScores = (
  customers: Customer[], 
  searchInput: CustomerSearchInput, 
  companyName?: string
): Customer[] => {
  // console.log(
    // '[calculateCustomerScores] Input: ',
    // 'customers:', JSON.stringify(customers.map(c => ({ id: c.id, name: c.company_name, phone: c.telephone }))),
    // 'searchInput:', JSON.stringify(searchInput),
    // 'companyNameForPhoneSearch:', companyName
  // );

  // Calculate scores for each customer
  const scoredCustomers = customers.map(customer => {
    // Calculate phone similarity
    // console.log(`[calculateCustomerScores] Scoring customer: ${customer.id} - ${customer.company_name}`);
    const phoneSimilarity = getPhoneSimilarity(
      searchInput.telephone || '',
      customer.telephone || ''
    );
    
    // Calculate company name similarity
    let nameSimilarity = 0;
    
    // Check if we have a company name to compare, either from search input or passed as parameter
    const searchCompanyName = searchInput.company_name || companyName || '';
    
    if (searchCompanyName && customer.company_name) {
      nameSimilarity = getNameSimilarity(searchCompanyName, customer.company_name);
    }
    
    // Calculate AFM similarity if applicable
    const afmSimilarity = searchInput.afm && customer.afm 
      ? (searchInput.afm === customer.afm ? 100 : 0) 
      : 0;
    
    // Calculate overall score with special rules
    let finalScore = 0;
    // console.log(`[calculateCustomerScores] Customer ${customer.id}: phoneSimilarity=${phoneSimilarity}, nameSimilarity=${nameSimilarity}, afmSimilarity=${afmSimilarity}`);
    
    // Keep track of which type of match this is
    let matchType = 'none';
    
    // Simple check for whether we're searching by phone or name or both
    const isPhoneSearch = searchInput.telephone && searchInput.telephone.trim() !== '';
    const isNameSearch = searchCompanyName && searchCompanyName.trim() !== '';
    
    // Specific rules for scoring that ensure combined matches always rank higher than single matches
    
    // Rule 1: If both name and phone have good similarity, boost score significantly
    if (nameSimilarity >= 35 && phoneSimilarity >= 35) {
      // Combined match (good phone + good name) gets a higher score formula
      // This approach ensures that a combined match with a mediocre name match still beats a phone-only match
      finalScore = Math.min(
        Math.round((phoneSimilarity * 0.6) + (nameSimilarity * 0.4) + 15),
        99  // Cap at 99 to reserve 100 for perfect matches only
      );
      matchType = 'combined';
    }
    // Rule 2: If only phone matches strongly and we're searching with a phone
    else if (isPhoneSearch && phoneSimilarity >= 45 && nameSimilarity < 30) {
      // Phone-only match gets a reduced score to ensure it's always lower than combined matches
      finalScore = Math.min(Math.round(phoneSimilarity * 0.9), 90); // Higher limit for phone matches
      matchType = 'phone-only';
    }
    // Rule 3: If only name matches strongly and we're searching with a name
    else if (isNameSearch && nameSimilarity >= 55 && phoneSimilarity < 30) {
      // Name-only match also gets a reasonable score
      finalScore = Math.min(Math.round(nameSimilarity * 0.9), 85); // Higher limit for name matches
      matchType = 'name-only';
    }
    // Rule 4: Default weighted scoring for other cases
    else {
      // Determine weights based on what was searched
      let phoneWeight = phoneSimilarity > 0 ? 0.6 : 0;  // Higher weight for phone
      let nameWeight = nameSimilarity > 0 ? 0.4 : 0;    // Lower weight for name
      let afmWeight = afmSimilarity > 0 ? 0.1 : 0;      // Minimal weight for AFM
      
      // Normalize weights to sum to 1
      const totalWeight = phoneWeight + nameWeight + afmWeight;
      if (totalWeight > 0) {
        phoneWeight /= totalWeight;
        nameWeight /= totalWeight;
        afmWeight /= totalWeight;
      }
      
      // Standard weighted calculation with cap
      finalScore = Math.min(
        Math.round(
          (phoneSimilarity * phoneWeight) +
          (nameSimilarity * nameWeight) +
          (afmSimilarity * afmWeight)
        ),
        80  // Cap default scoring at 80
      );
      
      matchType = 'weighted';
    }
    
    // Record the original similarities for debugging
    const originalScores = {
      phoneSimilarity,
      nameSimilarity,
      afmSimilarity
    };
    
    // Give a minimum floor score to ALL matches found by the database
    // This ensures they'll always show up regardless of scoring
    if (isPhoneSearch && phoneSimilarity > 0 && finalScore < 30) {
      finalScore = 30; // Ensure phone matches always appear with at least 30
      matchType = 'phone-floor';
    }
    
    if (isNameSearch && nameSimilarity > 0 && finalScore < 30) {
      finalScore = 30; // Ensure name matches always appear with at least 30
      matchType = 'name-floor';
    }
    
    // Log the scoring details
    console.log('Score for:', customer.company_name, {
      phoneSimilarity, 
      nameSimilarity, 
      afmSimilarity,
      finalScore,
      matchType,
      isCombined: (nameSimilarity >= 35 && phoneSimilarity >= 35)
    });
    
    // Add match reasons for UI highlighting
    const matchReasons = {
      telephone: phoneSimilarity > 30, // Lower threshold to mark more matches
      companyName: nameSimilarity > 30, // Lower threshold to mark more matches
      afm: afmSimilarity > 0
    };
    
    customer.originalScores = originalScores; // Assign originalScores
    customer.matchReasons = matchReasons;     // Assign matchReasons
    customer.similarityScore = finalScore;    // Assign finalScore to similarityScore
    customer.matchType = matchType;
    console.log(`[calculateCustomerScores] Customer ${customer.id}: finalScore=${finalScore}, matchType=${matchType}, originalScores=${JSON.stringify(originalScores)}, matchReasons=${JSON.stringify(matchReasons)}`);
    
    return customer; // Return the augmented customer object directly
  });
  
  // Sort by score (highest first) and return
  return scoredCustomers.sort((a, b) => {
    // First sort by score
    const scoreDiff = (b.similarityScore || 0) - (a.similarityScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    
    // If scores are equal, prefer the one with both company and phone matches
    const aHasBoth = a.matchReasons?.companyName && a.matchReasons?.telephone;
    const bHasBoth = b.matchReasons?.companyName && b.matchReasons?.telephone;
    
    if (aHasBoth && !bHasBoth) return -1;
    if (!aHasBoth && bHasBoth) return 1;
    
    // If both or neither have both matches, sort by company name
    return (a.company_name || '').localeCompare(b.company_name || '');
  });
};

/**
 * Find potential duplicate customers based on search criteria
 * @param searchInput Search criteria (company name, phone, AFM)
 * @param threshold Minimum similarity score (default: 65)
 * @returns Array of potential duplicate customers with similarity scores
 */
export const findPotentialDuplicates = async (
  searchInput: CustomerSearchInput,
  threshold: number = 65
): Promise<Customer[]> => {
  try {
    // console.log('findPotentialDuplicates input:', searchInput);
    console.log('findPotentialDuplicates input:', searchInput);
    console.log('[findPotentialDuplicates] Normalized phone for query:', searchInput.telephone ? normalizePhone(searchInput.telephone) : '');
    
    // Normalize search input
    const normalizedPhone = searchInput.telephone ? normalizePhone(searchInput.telephone) : '';
    // console.log('findPotentialDuplicates normalizedPhone:', normalizedPhone);
    
    // Build query conditions
    const conditions = [];
    
    if (searchInput.company_name) {
      conditions.push(`company_name.ilike.%${searchInput.company_name}%`);
      // console.log('Added company_name condition:', `company_name.ilike.%${searchInput.company_name}%`);
    }
    
    if (normalizedPhone) {
      // Special handling for 6983-50.50.43 format
      const hasDashDotFormat = searchInput.telephone.includes('-') && 
                              (searchInput.telephone.includes('.') || 
                               searchInput.telephone.endsWith('-') || 
                               searchInput.telephone.endsWith('-.'));
      
      // Add enhanced conditions for improved phone matching based on patterns
      if (hasDashDotFormat) {
        // Get the prefix before the dash
        const prefix = searchInput.telephone.split('-')[0];
        if (prefix && prefix.length >= 4) {
          // Add a condition to match the prefix with the dash pattern
          conditions.push(`telephone.ilike.${prefix}-%`);
          // console.log('Added special prefix condition:', `telephone.ilike.${prefix}-%`);
        }
      }
      
      // Only search for phone if we have a meaningful number of digits (e.g., >= 5)
      if (normalizedPhone && normalizedPhone.length >= 5) {
        const MIN_LENGTH_FOR_FLEXIBLE_SEARCH = 6;

        if (normalizedPhone.length < MIN_LENGTH_FOR_FLEXIBLE_SEARCH) {
          // For 5-digit numbers, search for the entire normalized input as a contiguous block.
          conditions.push(`telephone.ilike.%${normalizedPhone}%`);
          // console.log('Added telephone condition (substring match for partial number):', `telephone.ilike.%${normalizedPhone}%`);
        } else {
          // For longer phones (6+ digits), use the flexible pattern to catch formatting variations.
          const fullPattern = '%' + normalizedPhone.split('').join('%') + '%';
          conditions.push(`telephone.ilike.${fullPattern}`);
          // console.log('Added telephone condition (flexible pattern for full number):', `telephone.ilike.${fullPattern}`);
        }
      } else {
        console.log('Normalized phone too short for searching or empty, skipping phone condition');
      }
    }
    
    if (searchInput.afm) {
      conditions.push(`afm.eq.${searchInput.afm}`);
      // console.log('Added afm condition:', `afm.eq.${searchInput.afm}`);
    }
    
    // If no search criteria, return empty array
    if (conditions.length === 0) {
      console.log('findPotentialDuplicates: No search conditions, returning empty array');
      return [];
    }
    
    // console.log('Final OR conditions:', conditions.join(','));
    
    // Build and execute query
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .or(conditions.join(','))
      .is('deleted', false)
      .limit(100);
      
    // console.log('findPotentialDuplicates query result:', { 
      // customersFound: customers?.length || 0, 
      // error,
      // customers: customers?.map(c => ({ id: c.id, company: c.company_name, phone: c.telephone }))
    // });
    
    if (error) {
      console.error('Error fetching potential duplicates:', error);
      return [];
    }
    
    // Use lower threshold for short search terms
    const adjustedThreshold = 
      searchInput.company_name && searchInput.company_name.length <= 5 ? 
      Math.max(30, threshold - 25) : threshold;
    
    // console.log(`Using adjusted threshold: ${adjustedThreshold} for search term: ${searchInput.company_name}`);
    
    // Process results using our common scoring function
    const scoredCustomers = calculateCustomerScores(customers || [], searchInput);
    
    // CRITICAL: For phone searches, we must return ALL phone matches regardless of other factors
    // This ensures that ΤΑΜΑΓΙΑΝΝΗ will always appear when searching for its phone number
    let filteredCustomers = [];
    
    // If searching with a phone, include ALL records found by phone search
    if (normalizedPhone) {
      console.log('Phone search detected, showing ALL records found with phone match');
      
      // Include ALL records from phone search with any phone similarity
      // console.log('Phone search detected. Filtering based on adjustedThreshold or high individual scores.');
      filteredCustomers = scoredCustomers.filter(customer => {
        // Keep if overall score meets the adjusted threshold
        if (customer.similarityScore >= adjustedThreshold) {
          // console.log(`KEEPING match (phone search): ${customer.company_name} - Score: ${customer.similarityScore} >= adjustedThreshold: ${adjustedThreshold}`);
          return true;
        }
        // As a fallback, keep if there's a very high phone or name similarity
        const phoneSimilarity = customer.originalScores?.phoneSimilarity || 0;
        const nameSimilarity = customer.originalScores?.nameSimilarity || 0;
        if (phoneSimilarity >= 75) { // Higher specific threshold for phone
             // console.log(`KEEPING match (phone search): ${customer.company_name} - High Phone Similarity: ${phoneSimilarity}`);
             return true;
        }
        if (nameSimilarity >= 85 && searchInput.company_name) { // Higher specific threshold for name, only if company name was part of input
             // console.log(`KEEPING match (phone search): ${customer.company_name} - High Name Similarity: ${nameSimilarity}`);
             return true;
        }
        return false;
      });
    } else {
      // If not searching by phone, apply normal filtering
      // console.log(`[Else Block] Filtering ${scoredCustomers.length} customers. AdjustedThreshold: ${adjustedThreshold}`);
      filteredCustomers = scoredCustomers.filter(customer => {
        const nameSimilarity = customer.originalScores?.nameSimilarity || 0;
        const phoneSimilarity = customer.originalScores?.phoneSimilarity || 0;
        
        // console.log(`[Else Block] Customer: ${customer.company_name}, ID: ${customer.id}, Score: ${customer.similarityScore}, NameSim: ${nameSimilarity}, PhoneSim: ${phoneSimilarity}`);

        // Condition 1: Overall score meets threshold
        if (customer.similarityScore >= adjustedThreshold) {
          // console.log(`[Else Block] KEEP (Cond1): Customer ${customer.id} - Score ${customer.similarityScore} >= adjustedThreshold ${adjustedThreshold}`);
          return true;
        }
        
        // Condition 2: Decent name and phone similarity
        if (nameSimilarity >= 35 && phoneSimilarity >= 35) {
          // console.log(`[Else Block] KEEP (Cond2): Customer ${customer.id} - NameSim ${nameSimilarity} >= 35 && PhoneSim ${phoneSimilarity} >= 35`);
          return true;
        }
        
        // console.log(`[Else Block] REJECT: Customer ${customer.id} (${customer.company_name})`);
        return false;
      });
      // console.log(`[Else Block] filteredCustomers count after filter: ${filteredCustomers.length}`);
    }
    
    // console.log('Processed results:', {
      // inputCount: customers?.length || 0,
      // scoredCount: scoredCustomers.length,
      // filteredCount: filteredCustomers.length,
      // threshold: adjustedThreshold,
      // scores: scoredCustomers.map(c => ({ 
        // company: c.company_name, 
        // phone: c.telephone,
        // score: c.similarityScore,
        // passes: c.similarityScore >= adjustedThreshold,
        // phoneSim: c.originalScores?.phoneSimilarity,
        // nameSim: c.originalScores?.nameSimilarity,
        // kept: filteredCustomers.some(f => f.id === c.id)
      // }))
    // });
    
    // Final filter based on the original minScoreThreshold from the form
    const finalFilteredCustomers = filteredCustomers.filter(
      customer => customer.similarityScore >= threshold // 'threshold' here is the original minScoreThreshold
    );

    // console.log(`Final filtering: ${filteredCustomers.length} -> ${finalFilteredCustomers.length} customers after applying minScoreThreshold: ${threshold}`);

    // Sort by score and return
    return finalFilteredCustomers.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
  } catch (error) {
    console.error('Error in findPotentialDuplicates:', error);
    return [];
  }
};

/**
 * Find customers with exact phone number matches
 * @param phone Phone number to search for
 * @param companyName Optional company name to compare with
 * @returns Array of customers with matching phone numbers
 */
export const findExactPhoneMatches = async (
  phone: string,
  companyName?: string
): Promise<Customer[]> => {
  try {
    // console.log('[findExactPhoneMatches] Searching for phone:', phone, 'Normalized:', normalizedPhone, 'Company Name:', companyName);
    console.log('findExactPhoneMatches normalizedPhone:', normalizePhone(phone));
    
    if (!normalizePhone(phone)) {
      console.log('findExactPhoneMatches: No normalized phone, returning empty array');
      return [];
    }
    
    // For better pattern matching, we need to search in various ways
    // Extract just the significant digits without the formatting
    const digits = normalizePhone(phone).replace(/\D/g, '');
    
    if (digits.length < 5) { // Increased minimum length to 5 to align with frontend requirements
      console.log('findExactPhoneMatches: Phone number too short, minimum 5 digits required');
      return [];
    }
    
    // console.log('Executing Supabase query to find telephone match for digits:', digits);

    // Special handling for specific format pattern like 6983-50.50.43
    const hasDashDotFormat = phone.includes('-') && phone.includes('.');
    
    // Build search conditions for different search strategies
    let conditions = [];
    
    // Strategy 1: Full text search with original format
    conditions.push(`telephone.ilike.%${phone}%`);
    
    // Strategy 2: Substring search on digits sequence
    conditions.push(`telephone.ilike.%${digits}%`);
    
    // Strategy 3: Special format pattern matching
    if (hasDashDotFormat) {
      // Extract the digit groups from format like 6983-50.50.43
      const segments = digits.match(/\d+/g) || [];
      if (segments.length > 0) {
        // Use just the first segment (e.g., "6983" from "6983-50.50.43")
        if (segments[0].length >= 4) {
          conditions.push(`telephone.ilike.%${segments[0]}%`);
        }
      }
      
      // For the specific format common in this database
      if (phone.includes('-') && phone.includes('.')) {
        const firstPart = phone.split('-')[0];
        if (firstPart && firstPart.length >= 4) {
          conditions.push(`telephone.ilike.${firstPart}-%`);
        }
      }
    }
    
    // Join conditions with OR
    const conditionString = conditions.join(',');
    // console.log('Search conditions:', conditionString);
    
    // Execute query with all strategies
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .or(conditionString)
      .is('deleted', false)
      .limit(10);
      
    // console.log('Telephone search results:', { 
      // count: customers?.length || 0, 
      // error,
      // customers: customers?.map(c => ({ id: c.id, company: c.company_name, phone: c.telephone }))
    // });
    
    if (error) {
      console.error('Error fetching phone matches:', error);
      return [];
    }
    
    // If no results from first attempt, try an alternative approach
    let matchedCustomers = customers || [];
    
    if (!customers || customers.length === 0) {
      // console.log('No matches with primary strategies, trying direct specific queries');
      
      // Try direct query for this specific format
      if (phone.includes('-') && phone.includes('.')) {
        // Try with direct pattern matching for 6983-50.50.43 format
        const patternStart = phone.split('-')[0];
        
        if (patternStart && patternStart.length >= 4) {
          // console.log('Trying direct query with pattern start:', patternStart);
          
          const { data: directMatches, error: directError } = await supabase
            .from('customers')
            .select('*')
            .ilike('telephone', `${patternStart}-%`)
            .is('deleted', false)
            .limit(10);
            
          // console.log('Direct pattern query results:', {
            // count: directMatches?.length || 0,
            // error: directError,
            // matches: directMatches?.map(c => ({ id: c.id, company: c.company_name, phone: c.telephone }))
          // });
          
          if (!directError && directMatches && directMatches.length > 0) {
            matchedCustomers = directMatches;
          }
        }
      }
      
      // If still no results, try with just the first 4 digits as a last resort
      if (matchedCustomers.length === 0 && digits.length >= 5) {
        // console.log('Trying with first 5 digits as last resort:', digits.substring(0, 5));
        
        const { data: lastResortMatches, error: lastResortError } = await supabase
          .from('customers')
          .select('*')
          .ilike('telephone', `%${digits.substring(0, 5)}%`)
          .is('deleted', false)
          .limit(10);
          
        // console.log('Last resort query results:', {
          // count: lastResortMatches?.length || 0,
          // error: lastResortError,
          // matches: lastResortMatches?.map(c => ({ id: c.id, company: c.company_name, phone: c.telephone }))
        // });
        
        if (!lastResortError && lastResortMatches && lastResortMatches.length > 0) {
          matchedCustomers = lastResortMatches;
        }
      }
    }
    
    // If no matches were found after all attempts, return empty array
    if (matchedCustomers.length === 0) {
      return [];
    }
    
    // Process results using our common scoring function
    // Create a simple search input with the phone and, if available, the company name for better scoring
    const searchInput = {
      telephone: phone,
      company_name: companyName || '',
      afm: ''
    };
    
    // Include company name in search input when available to enable combined scoring
    // console.log('Using search input for scoring:', searchInput);
    
    // Calculate scores for all matches
    const scoredCustomers = calculateCustomerScores(matchedCustomers, searchInput);
    
    // Critical: For phone searches, ALWAYS return ALL matches - never filter them
    // This ensures every phone match is shown regardless of score
    // console.log('Phone search results - keeping ALL matches');
    scoredCustomers.forEach(c => {
      // console.log(`KEEPING: ${c.company_name} - phone: ${c.telephone}, score: ${c.score}`);
    });
    
    // Sort by score, but don't filter out any results
    return scoredCustomers.sort((a, b) => (b.score || 0) - (a.score || 0));
  } catch (error) {
    console.error('Error in findExactPhoneMatches:', error);
    return [];
  }
};

/**
 * Calculate similarity between phone numbers with improved format handling
 */
function calculatePhoneSimilarity(phone1: string, phone2: string): number {
  // console.log('[calculatePhoneSimilarity] Input phone1:', phone1, 'Input phone2:', phone2);
  if (!phone1 || !phone2) return 0;
  
  // Check for special case when one phone has dash-dot format like 6983-50.50.43
  const isDashDotFormat1 = phone1.includes('-') && (phone1.includes('.') || phone1.endsWith('-'));
  const isDashDotFormat2 = phone2.includes('-') && (phone2.includes('.') || phone2.endsWith('-'));
  
  // Extract just digits for comparison
  const digits1 = phone1.replace(/\D/g, '');
  const digits2 = phone2.replace(/\D/g, '');
  
  // If either is empty after normalization, return 0
  if (!digits1 || !digits2) return 0;
  
  // Exact match of all digits - perfect match
  if (digits1 === digits2) return 100;
  
  // Special case: Both have the dash-dot format pattern with same format, check exact match
  if (isDashDotFormat1 && isDashDotFormat2) {
    const prefix1 = phone1.split('-')[0];
    const prefix2 = phone2.split('-')[0];
    
    if (prefix1 === prefix2) {
      // Same prefix, but full number is different - common format, good match but not perfect
      return 85; 
    }
  }
  
  // Special case: One has special format, one doesn't, but prefix matches
  if ((isDashDotFormat1 || isDashDotFormat2) && 
      (phone1.startsWith(phone2.split('-')[0]) || 
       phone2.startsWith(phone1.split('-')[0]))) {
    // Format differs but prefix matches - decent match
    return 75;
  }
  
  // Special case handling for partial prefix matches with formatted numbers
  if (isDashDotFormat1 || isDashDotFormat2) {
    const phone1Prefix = phone1.split('-')[0] || '';
    const phone2Prefix = phone2.split('-')[0] || '';
    
    // Handle case when one phone number is a partial prefix of the special format
    if ((phone1Prefix && phone2Prefix && phone1Prefix.startsWith(phone2Prefix)) || 
        (phone1Prefix && phone2Prefix && phone2Prefix.startsWith(phone1Prefix))) {
      const prefixLength = Math.min(phone1Prefix.length, phone2Prefix.length);
      if (prefixLength >= 4) {
        return 75; // Good prefix match, ensure it's captured
      }
    }
    
    // Handle case when one number is just the formatted prefix
    if (phone1Prefix && phone1Prefix.length >= 4 && digits2.startsWith(phone1Prefix)) {
      return 75;
    }
    if (phone2Prefix && phone2Prefix.length >= 4 && digits1.startsWith(phone2Prefix)) {
      return 75;
    }
  }
  
  // For partial matches (one contains the other)
  if (digits1.includes(digits2) || digits2.includes(digits1)) {
    const minLength = Math.min(digits1.length, digits2.length);
    const maxLength = Math.max(digits1.length, digits2.length);
    
    // Calculate match percentage
    const basePercentage = Math.round((minLength / maxLength) * 100);
    
    // Beginning of phone number matches (prefix matching)
    if (digits1.startsWith(digits2) || digits2.startsWith(digits1)) {
      // Prefix matches are more important than substring matches elsewhere
      if (minLength >= 6) {
        return Math.min(basePercentage + 10, 85); // Good prefix match
      } else if (minLength >= 4) {
        return Math.min(basePercentage + 5, 75); // Medium prefix match
      } else {
        return Math.min(basePercentage, 60); // Lower confidence for short matches
      }
    }
    
    // Digit sequence matches, but not at beginning
    if (minLength >= 7) {
      return Math.min(basePercentage + 5, 75); // Significant number of digits match
    } else if (minLength >= 5) {
      return Math.min(basePercentage, 70); // Medium number of digits match
    } else {
      return Math.min(basePercentage, 50); // Low confidence for shorter matches
    }
  }
  
  // Calculate prefix match (starting digits)
  let matchingPrefixDigits = 0;
  const minPrefixLength = Math.min(digits1.length, digits2.length);
  
  for (let i = 0; i < minPrefixLength; i++) {
    if (digits1[i] === digits2[i]) {
      matchingPrefixDigits++;
    } else {
      break;
    }
  }
  
  // Score based on matching prefix length
  if (matchingPrefixDigits >= 4) {
    const prefixScore = Math.min(30 + (matchingPrefixDigits * 8), 70);
    // console.log(`[calculatePhoneSimilarity] Prefix match >= 4 digits (${matchingPrefixDigits}). Returning ${prefixScore}.`);
    return prefixScore; // Max 70% for prefix-only match
  } else if (matchingPrefixDigits >= 3) {
    const prefixScore = 20 + (matchingPrefixDigits * 5);
    // console.log(`[calculatePhoneSimilarity] Prefix match >= 3 digits (${matchingPrefixDigits}). Returning ${prefixScore}.`);
    return prefixScore; // 20-35% for 3-4 digit prefix
  } else if (matchingPrefixDigits > 0) {
    const prefixScore = 10 + (matchingPrefixDigits * 3);
    // console.log(`[calculatePhoneSimilarity] Prefix match > 0 digits (${matchingPrefixDigits}). Returning ${prefixScore}.`);
    return prefixScore; // 10-20% for 1-3 digit prefix
  }
  
  return 0; // No significant match
}

/**
 * Calculate similarity between company names with improved handling of Greek text and 
 * special boost for short search terms that match longer company names
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;
  
  // Convert to lowercase for case-insensitive comparison
  const lowerName1 = name1.toLowerCase().trim();
  const lowerName2 = name2.toLowerCase().trim();
  
  // Exact match
  if (lowerName1 === lowerName2) return 100;
  
  // Special case: Short search term matching beginning of company name
  // e.g., "αερο" matching "ΑΕΡΟΠΟΡΙΑ"
  if (lowerName1.length <= 5 && lowerName2.startsWith(lowerName1)) {
    // Calculate percentage of the short name that matches
    const matchPercentage = Math.round((lowerName1.length / lowerName2.length) * 100);
    // Return a reasonable score for prefix matches with short search terms
    return Math.min(matchPercentage + 25, 85);
  }
  
  // Short company name is contained at beginning of longer name
  if (lowerName2.length <= 5 && lowerName1.startsWith(lowerName2)) {
    const matchPercentage = Math.round((lowerName2.length / lowerName1.length) * 100);
    return Math.min(matchPercentage + 20, 80);
  }
  
  // One name contains the other completely (but not at the beginning)
  if (lowerName1.includes(lowerName2) || lowerName2.includes(lowerName1)) {
    const minLength = Math.min(lowerName1.length, lowerName2.length);
    const maxLength = Math.max(lowerName1.length, lowerName2.length);
    
    // Ensure short inputs (like "αερ") will also match
    if (minLength >= 3 && minLength <= 5) {
      // For short search terms (3-5 chars), give a modest boost
      return Math.min(Math.round((minLength / maxLength) * 100) + 15, 75);
    }
    
    // Regular containment calculation
    return Math.min(Math.round((minLength / maxLength) * 90), 70); // Up to 70% for containment
  }
  
  // Simple word overlap scoring
  const words1 = lowerName1.split(/\s+/);
  const words2 = lowerName2.split(/\s+/);
  
  // Count matching words
  let matchingWords = 0;
  for (const word1 of words1) {
    if (word1.length < 3) continue; // Skip small words
    
    for (const word2 of words2) {
      if (word2.length < 3) continue; // Skip small words
      
      // Consider a word match if one contains the other
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matchingWords++;
        break;
      }
    }
  }
  
  const totalUniqueWords = new Set([...words1, ...words2]).size;
  
  // Calculate percentage of matching words
  if (totalUniqueWords > 0 && matchingWords > 0) {
    return Math.min(Math.round((matchingWords / totalUniqueWords) * 70), 65); // Up to 65% for word matching
  }
  
  return 0; // No significant match
}

// Re-export types and utility functions
export * from './types';
export * from './normalizers';
export * from './scoring';
export * from './similarity/nameMatching';
export * from './similarity/phoneMatching';
export * from './similarity/afmMatching'; 