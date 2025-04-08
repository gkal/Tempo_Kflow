export interface Customer {
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
  matchReasons?: {
    companyName?: boolean;
    telephone?: boolean;
    afm?: boolean;
  };
  originalScores?: {
    phoneSimilarity: number;
    nameSimilarity: number;
    afmSimilarity: number;
  };
}

export interface CustomerSearchInput {
  company_name: string;
  telephone: string;
  afm: string;
}

export interface SimilarityResult {
  score: number;
  details?: {
    nameScore: number;
    phoneScore: number;
    afmScore: number;
  };
} 