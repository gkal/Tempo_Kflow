import React from 'react';
import { Archive } from "lucide-react";
import { Customer } from './types/CustomerTypes';
import { highlightMatchingText } from './utils/customerFormUtils';
import { dangerouslyRenderHighlight } from './utils/displayUtils';

interface PotentialMatchesTableProps {
  matches: Customer[];
  onSelectMatch: (customerId: string, score?: number) => void;
}

const PotentialMatchesTable: React.FC<PotentialMatchesTableProps> = ({ 
  matches,
  onSelectMatch
}) => {
  if (!matches || matches.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-[#cad2c5]">
          Νέο τμήμα που θα υλοποιηθεί σύντομα!
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#cad2c5]">
      <table className="min-w-full divide-y divide-[#52796f]">
        <thead className="bg-[#2f3e46]">
          <tr>
            <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Ομοιότητα</th>
            <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Επωνυμία</th>
            <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">ΑΦΜ</th>
            <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Τηλέφωνο</th>
            <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Email</th>
            <th scope="col" className="px-3 py-1 text-left text-xs font-medium text-[#a8c5b5] uppercase tracking-wider">Διεύθυνση</th>
          </tr>
        </thead>
        <tbody className="bg-[#2f3e46] divide-y divide-[#52796f]">
          {matches.map((match) => (
            <tr 
              key={match.id} 
              className={`${match.deleted ? 'opacity-60' : ''} cursor-pointer hover:bg-[#354f52]`}
              onClick={() => onSelectMatch(match.id, match.score)}
            >
              <td className="px-3 py-1 whitespace-nowrap text-xs">
                <span className={`inline-block px-1.5 py-0.5 rounded-full ${
                  match.score && match.score >= 86
                    ? 'bg-red-600 text-white' /* High confidence match (≥86%): red background, white text */
                    : 'bg-yellow-400 text-black' /* Lower confidence match (<86%): yellow background, black text */
                }`}>
                  {match.score}%
                </span>
              </td>
              <td className="px-3 py-1 whitespace-nowrap text-xs">
                <div className="flex items-center">
                  <span className="font-medium">
                    {dangerouslyRenderHighlight(
                      highlightMatchingText(
                        match.company_name, 
                        !!match.matchReasons?.companyName,
                        match.score >= 80
                      )
                    )}
                  </span>
                  {match.deleted && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-1 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-200">
                      <Archive className="mr-1 h-3 w-3" />
                      Διαγραμμένος
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-1 whitespace-nowrap text-xs">
                {dangerouslyRenderHighlight(
                  highlightMatchingText(
                    match.afm, 
                    !!match.matchReasons?.afm,
                    match.score >= 80
                  )
                )}
              </td>
              <td className="px-3 py-1 whitespace-nowrap text-xs">
                {dangerouslyRenderHighlight(
                  highlightMatchingText(
                    match.telephone, 
                    !!match.matchReasons?.telephone,
                    match.score >= 80
                  )
                )}
              </td>
              <td className="px-3 py-1 whitespace-nowrap text-xs">{match.email || '-'}</td>
              <td className="px-3 py-1 whitespace-nowrap text-xs">{match.address || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PotentialMatchesTable; 