import * as duplicateDetectionService from '@/services/duplicate-detection';
import { createPrefixedLogger } from "@/utils/loggingUtils";
import { Customer } from '../types/CustomerTypes';

const logger = createPrefixedLogger('DuplicateDetection');

// Find matches using customer name, phone, and AFM
export const findMatches = async (companyName: string, phoneValue: string, afm: string): Promise<Customer[]> => {
  // Only search if we have at least 2 characters for company name or at least 5 digits for phone
  const phoneDigits = phoneValue ? phoneValue.replace(/\D/g, '').length : 0;
  const hasMinCompanyChars = companyName && companyName.length >= 2;
  const hasMinPhoneDigits = phoneDigits >= 5; // Changed from 3 to 5 digits
  
  if (hasMinCompanyChars || hasMinPhoneDigits) {
    // Log what we're searching with
    logger.debug('findMatches search criteria:', {
      company_name: companyName || 'None',
      telephone: phoneValue || 'None',
      phoneDigits: phoneDigits,
      afm: afm || 'None'
    });
    
    const matches = await duplicateDetectionService.findPotentialDuplicates({
      company_name: companyName,
      telephone: phoneValue, // Include phone in company name search for better matching
      afm: afm || ''
    }, 40); // Reduced threshold to 40% to show more matches with our new scoring system
    
    logger.debug('Find matches results:', {
      searchTerm: companyName || phoneValue,
      results: matches.length,
      matches: matches.map(m => ({ 
        company: m.company_name, 
        phone: m.telephone, 
        score: m.score,
        phoneSimilarity: m.originalScores?.phoneSimilarity,
        nameSimilarity: m.originalScores?.nameSimilarity
      }))
    });
    
    return matches;
  } else {
    return [];
  }
};

// Use the duplicateDetectionService to find exact phone matches using database normalization
export const phoneSearch = async (phoneValue: string, companyName: string): Promise<Customer[]> => {
  logger.debug('phoneSearch called with phoneValue:', phoneValue);
  
  if (!phoneValue || phoneValue.trim() === '') {
    logger.debug('phoneSearch: Empty phone value, returning empty array');
    return [];
  }

  // Minimum digits required changed to 5 for phone search
  const cleanedPhoneForCheck = phoneValue.replace(/\D/g, '');
  if (cleanedPhoneForCheck.length < 5) {
    logger.debug('phoneSearch: Phone too short, minimum 5 digits required. Current length:', cleanedPhoneForCheck.length);
    return [];
  }

  try {
    // Use our unified findPotentialDuplicates function which has improved matching for partial phones
    logger.debug('phoneSearch: Using unified search with phone:', phoneValue);
    
    const matches = await duplicateDetectionService.findPotentialDuplicates({
      company_name: companyName || '',
      telephone: phoneValue,
      afm: ''
    }, 40); // Lower threshold for phone searches
    
    logger.debug('phoneSearch: Final results:', {
      matchCount: matches.length,
      companyNameUsed: companyName || 'None',
      matches: matches.map(m => ({ 
        id: m.id, 
        company: m.company_name, 
        phone: m.telephone,
        score: m.score,
        phoneSimilarity: m.originalScores?.phoneSimilarity,
        nameSimilarity: m.originalScores?.nameSimilarity
      }))
    });

    return matches;
  } catch (e) {
    logger.error("Phone search failed:", e);
    return [];
  }
}; 