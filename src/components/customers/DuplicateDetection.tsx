import React from 'react';
import { useState, useEffect } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { findPotentialDuplicates } from '@/services/duplicateDetectionService';
import { Archive } from 'lucide-react';

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

interface DuplicateDetectionProps {
  companyName: string;
  phoneNumber: string;
  afm: string;
  onSelectMatch?: (customerId: string) => void;
}

const DuplicateDetection: React.FC<DuplicateDetectionProps> = ({
  companyName,
  phoneNumber,
  afm,
  onSelectMatch
}) => {
  const [potentialMatches, setPotentialMatches] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use the actual service with fuzzball for fuzzy matching
  useEffect(() => {
    const detectDuplicates = async () => {
      // Only search if company name has at least 3 characters
      if (!companyName || companyName.trim().length < 3) {
        setPotentialMatches([]);
        return;
      }

      setIsLoading(true);
      try {
        // Call the service with our search parameters
        const matches = await findPotentialDuplicates({
          company_name: companyName,
          telephone: phoneNumber,
          afm: afm
        }, 75); // Set minimum threshold to 75%
        
        setPotentialMatches(matches);
      } catch (error) {
        console.error('Error detecting duplicates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the duplicate detection to avoid excessive API calls
    const debounceTimeout = setTimeout(() => {
      detectDuplicates();
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [companyName, phoneNumber, afm]);

  // Helper function to get match details for display
  const getMatchDetails = (match: Customer) => {
    const details = [];
    
    if (match.company_name && companyName && match.company_name !== companyName) {
      details.push('επωνυμία');
    }
    
    if (match.telephone && phoneNumber && match.telephone !== phoneNumber) {
      details.push('τηλέφωνο');
    }
    
    if (match.afm && afm && match.afm === afm) {
      details.push('ΑΦΜ');
    }
    
    if (details.length === 0) {
      return 'γενική ομοιότητα';
    }
    
    return details.join(', ');
  };

  // Get score badge color based on match score
  const getScoreBadgeColor = (score: number = 0) => {
    if (score >= 80) {
      return 'bg-red-200 text-red-800 dark:bg-red-700/50 dark:text-red-200';
    }
    return 'bg-amber-200 text-amber-800 dark:bg-amber-700/50 dark:text-amber-200';
  };

  // No need to display anything if no matches
  if (potentialMatches.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        {potentialMatches.length === 1 
          ? 'Βρέθηκε 1 πιθανή διπλοεγγραφή' 
          : `Βρέθηκαν ${potentialMatches.length} πιθανές διπλοεγγραφές`}
      </h3>
      
      <div className="overflow-hidden border border-gray-200 dark:border-gray-700 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Επωνυμία</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ΑΦΜ</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Τηλέφωνο</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ομοιότητα</th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ενέργεια</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {potentialMatches.map((match) => (
              <tr 
                key={match.id} 
                className={`${match.deleted ? 'opacity-60' : ''}`}
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm">
                  <div className="flex items-center">
                    <span className="font-medium">{match.company_name}</span>
                    {match.deleted && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-200">
                        <Archive className="mr-1 h-3 w-3" />
                        Διαγραμμένος
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm">{match.afm}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm">{match.telephone}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full ${getScoreBadgeColor(match.score)}`}>
                    {match.score}% ({getMatchDetails(match)})
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                  <button
                    onClick={() => onSelectMatch?.(match.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Επιλογή
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DuplicateDetection; 