import { CustomerSearchInput, Customer, SimilarityResult } from './types';
import { getNameSimilarity } from './similarity/nameMatching';
import { getPhoneSimilarity } from './similarity/phoneMatching';
import { getAfmSimilarity } from './similarity/afmMatching';

/**
 * Calculate overall similarity score between search input and customer
 * @param searchInput Search criteria
 * @param customer Customer to compare against
 * @returns Similarity score and details
 */
export const calculateSimilarityScore = (
  searchInput: CustomerSearchInput,
  customer: Customer
): SimilarityResult => {
  // Calculate individual similarity scores
  const nameSimilarity = getNameSimilarity(searchInput.company_name, customer.company_name);
  const phoneSimilarity = getPhoneSimilarity(searchInput.telephone, customer.telephone);
  const afmSimilarity = getAfmSimilarity(searchInput.afm, customer.afm);
  
  // Calculate weighted score
  const score = calculateWeightedScore(nameSimilarity, phoneSimilarity, afmSimilarity, searchInput);
  
  return {
    score,
    details: {
      nameScore: nameSimilarity,
      phoneScore: phoneSimilarity,
      afmScore: afmSimilarity
    }
  };
};

/**
 * Calculate weighted similarity score based on field importance
 */
const calculateWeightedScore = (
  nameSimilarity: number,
  phoneSimilarity: number,
  afmSimilarity: number,
  searchInput: CustomerSearchInput
): number => {
  // Base weights
  let nameWeight = 0.4;   // 40%
  let phoneWeight = 0.4;  // 40%
  let afmWeight = 0.2;    // 20%
  
  // Adjust weights based on available search criteria
  const hasName = !!searchInput.company_name;
  const hasPhone = !!searchInput.telephone;
  const hasAfm = !!searchInput.afm;
  
  // Count available fields for weight distribution
  const availableFields = [hasName, hasPhone, hasAfm].filter(Boolean).length;
  
  if (availableFields === 0) return 0;
  
  // Redistribute weights based on available fields
  if (!hasName) nameWeight = 0;
  if (!hasPhone) phoneWeight = 0;
  if (!hasAfm) afmWeight = 0;
  
  // Normalize weights to sum to 1
  const totalWeight = nameWeight + phoneWeight + afmWeight;
  if (totalWeight > 0) {
    nameWeight /= totalWeight;
    phoneWeight /= totalWeight;
    afmWeight /= totalWeight;
  }
  
  // Calculate weighted score
  return Math.round(
    (nameSimilarity * nameWeight) +
    (phoneSimilarity * phoneWeight) +
    (afmSimilarity * afmWeight)
  );
};

/**
 * Process and filter customer data based on similarity scores
 */
export const processCustomerData = (
  customers: Customer[],
  searchInput: CustomerSearchInput,
  threshold: number = 65
): Customer[] => {
  return customers
    .map(customer => ({
      ...customer,
      score: calculateSimilarityScore(searchInput, customer).score
    }))
    .filter(customer => customer.score >= threshold)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}; 