import React, { useState } from 'react';
import { OptimizationSuggestion } from '@/services/monitoring/databasePerformanceService';
import { supabase } from '@/lib/supabaseClient';

interface QueryOptimizationCardProps {
  suggestion: OptimizationSuggestion;
  onImplement: (suggestion: OptimizationSuggestion) => void;
}

/**
 * QueryOptimizationCard Component
 * 
 * Displays a single query optimization suggestion with details and implementation options
 */
export function QueryOptimizationCard({ suggestion, onImplement }: QueryOptimizationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [implementationResult, setImplementationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Get priority color based on suggestion priority
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return {
          bg: 'bg-red-50',
          text: 'text-red-600',
          border: 'border-red-200',
          icon: 'bg-red-100 text-red-600'
        };
      case 'medium':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-600',
          border: 'border-orange-200',
          icon: 'bg-orange-100 text-orange-600'
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          border: 'border-blue-200',
          icon: 'bg-blue-100 text-blue-600'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          border: 'border-gray-200',
          icon: 'bg-gray-100 text-gray-600'
        };
    }
  };

  // Get suggestion type icon
  const getSuggestionTypeIcon = (type: string) => {
    switch (type) {
      case 'index': return '📇';
      case 'query': return '🔍';
      case 'table': return '📊';
      case 'transaction': return '🔄';
      case 'configuration': return '⚙️';
      default: return '💡';
    }
  };

  const colors = getPriorityColor(suggestion.priority);

  // Handle implementation of the suggestion
  const handleImplement = async () => {
    try {
      setIsImplementing(true);
      setImplementationResult(null);

      // Only implement if there's an implementation
      if (!suggestion.implementation) {
        setImplementationResult({
          success: false,
          message: 'Δεν υπάρχει αυτόματος τρόπος υλοποίησης'
        });
        return;
      }

      // Execute the implementation SQL via RPC
      // @ts-ignore - This RPC function exists in the database but isn't typed in the schema
      const { data, error } = await supabase.rpc('run_sql_query', {
        sql_query: suggestion.implementation
      });

      if (error) {
        setImplementationResult({
          success: false,
          message: `Σφάλμα: ${error.message}`
        });
      } else {
        setImplementationResult({
          success: true,
          message: 'Επιτυχής υλοποίηση'
        });
        // Notify parent component
        onImplement(suggestion);
      }
    } catch (err) {
      setImplementationResult({
        success: false,
        message: `Σφάλμα: ${err instanceof Error ? err.message : 'Άγνωστο σφάλμα'}`
      });
    } finally {
      setIsImplementing(false);
    }
  };

  return (
    <div 
      className={`mb-4 rounded-lg border shadow-sm ${colors.bg} ${colors.border}`}
    >
      <div 
        className="px-4 py-3 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <span className={`mr-3 p-2 rounded-full ${colors.icon}`}>
            {getSuggestionTypeIcon(suggestion.type)}
          </span>
          <div>
            <h3 className={`text-sm font-medium ${colors.text}`}>{suggestion.suggestion}</h3>
            <p className="text-xs text-gray-500 mt-1">{suggestion.rationale}</p>
          </div>
        </div>
        <div className="flex items-center">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium mr-3 ${colors.text} ${colors.bg}`}>
            {suggestion.priority.toUpperCase()}
          </span>
          <svg 
            className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="text-sm space-y-3">
            <div>
              <span className="font-medium text-gray-700">Τύπος:</span>
              <span className="ml-2 text-gray-600">{suggestion.type}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Πιθανή Βελτίωση:</span>
              <span className="ml-2 text-gray-600">{suggestion.potentialImprovement}</span>
            </div>
            {suggestion.implementation && (
              <div>
                <span className="font-medium text-gray-700">Υλοποίηση:</span>
                <pre className="mt-1 bg-gray-800 text-white p-2 rounded text-xs overflow-x-auto">
                  {suggestion.implementation}
                </pre>
              </div>
            )}
            {suggestion.affectedQueries && suggestion.affectedQueries.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Επηρεαζόμενα Ερωτήματα:</span>
                <div className="mt-1 max-h-32 overflow-y-auto">
                  {suggestion.affectedQueries.map((query, index) => (
                    <pre key={index} className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mb-1">
                      {query}
                    </pre>
                  ))}
                </div>
              </div>
            )}
            {implementationResult && (
              <div className={`p-2 rounded ${implementationResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {implementationResult.message}
              </div>
            )}
            {suggestion.implementation && (
              <div className="flex justify-end">
                <button
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  onClick={handleImplement}
                  disabled={isImplementing}
                >
                  {isImplementing ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Υλοποίηση...
                    </span>
                  ) : (
                    'Υλοποίηση Πρότασης'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface QueryOptimizationListProps {
  suggestions: OptimizationSuggestion[];
  onRefresh: () => void;
}

/**
 * QueryOptimizationList Component
 * 
 * Displays a list of query optimization suggestions, categorized by priority
 */
export default function QueryOptimizationList({ suggestions, onRefresh }: QueryOptimizationListProps) {
  const [implementedSuggestions, setImplementedSuggestions] = useState<{[key: string]: boolean}>({});

  // Group suggestions by priority
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
  const mediumPrioritySuggestions = suggestions.filter(s => s.priority === 'medium');
  const lowPrioritySuggestions = suggestions.filter(s => s.priority === 'low');

  // Handle suggestion implementation
  const handleImplement = (suggestion: OptimizationSuggestion) => {
    // Mark as implemented to provide visual feedback
    setImplementedSuggestions({
      ...implementedSuggestions,
      // Use suggestion content as a simple way to create a unique key
      [suggestion.suggestion + suggestion.type]: true
    });

    // Trigger refresh after a delay to allow for changes to take effect
    setTimeout(onRefresh, 1500);
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Όλα καλά!</h3>
          <p className="mt-2 text-sm text-gray-500">Δεν βρέθηκαν προτάσεις βελτιστοποίησης αυτή τη στιγμή.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Προτάσεις Βελτιστοποίησης</h2>
        <div className="text-sm text-gray-500">
          {suggestions.length} {suggestions.length === 1 ? 'πρόταση' : 'προτάσεις'} βρέθηκαν
        </div>
      </div>

      {highPrioritySuggestions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-red-600 mb-3">
            Υψηλής Προτεραιότητας ({highPrioritySuggestions.length})
          </h3>
          {highPrioritySuggestions.map((suggestion, index) => (
            <QueryOptimizationCard 
              key={`high-${index}`}
              suggestion={suggestion}
              onImplement={handleImplement}
            />
          ))}
        </div>
      )}

      {mediumPrioritySuggestions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-orange-600 mb-3">
            Μεσαίας Προτεραιότητας ({mediumPrioritySuggestions.length})
          </h3>
          {mediumPrioritySuggestions.map((suggestion, index) => (
            <QueryOptimizationCard 
              key={`medium-${index}`}
              suggestion={suggestion} 
              onImplement={handleImplement}
            />
          ))}
        </div>
      )}

      {lowPrioritySuggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-blue-600 mb-3">
            Χαμηλής Προτεραιότητας ({lowPrioritySuggestions.length})
          </h3>
          {lowPrioritySuggestions.map((suggestion, index) => (
            <QueryOptimizationCard 
              key={`low-${index}`}
              suggestion={suggestion}
              onImplement={handleImplement}
            />
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          Ανανέωση Προτάσεων
        </button>
      </div>
    </div>
  );
} 