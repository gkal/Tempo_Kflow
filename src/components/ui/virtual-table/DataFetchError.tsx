import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataFetchErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function DataFetchError({ 
  message = 'An error occurred while fetching data.', 
  onRetry 
}: DataFetchErrorProps) {
  return (
    <div className="w-full p-6 flex flex-col items-center justify-center bg-red-500/10 rounded-md border border-red-500/20">
      <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
      <p className="text-red-500 font-medium mb-4">{message}</p>
      {onRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          className="bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10"
        >
          Retry
        </Button>
      )}
    </div>
  );
}

export default DataFetchError; 
