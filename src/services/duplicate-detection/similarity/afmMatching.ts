import { normalizeAfm } from '../normalizers';

/**
 * Compare AFM (tax ID) numbers
 * @param afm1 First AFM number
 * @param afm2 Second AFM number to compare
 * @returns Similarity score 0-100
 */
export const getAfmSimilarity = (afm1: string, afm2: string): number => {
  if (!afm1 || !afm2) return 0;
  
  const normalized1 = normalizeAfm(afm1);
  const normalized2 = normalizeAfm(afm2);
  
  // If either is empty after normalization, return 0
  if (!normalized1 || !normalized2) return 0;
  
  // Exact match
  if (normalized1 === normalized2) return 100;
  
  // For AFM, we only consider exact matches
  // This is because AFM is a unique identifier and partial matches
  // are not meaningful in this context
  return 0;
}; 