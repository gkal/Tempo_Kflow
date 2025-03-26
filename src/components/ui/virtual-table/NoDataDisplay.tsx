import React from 'react';
import { DatabaseZap } from 'lucide-react';

interface NoDataDisplayProps {
  message?: string;
  icon?: React.ReactNode;
}

export function NoDataDisplay({ 
  message = 'No data available', 
  icon = <DatabaseZap className="h-8 w-8 text-[#84a98c]/50" />
}: NoDataDisplayProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4">{icon}</div>
      <p className="text-[#84a98c] text-sm">{message}</p>
    </div>
  );
}

export default NoDataDisplay; 