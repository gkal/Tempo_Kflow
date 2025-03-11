import React from 'react';
import { Home, User, Settings } from 'lucide-react';

export function TestIcon() {
  return (
    <div className="flex gap-4 text-white">
      <div>Icon 1: <Home /></div>
      <div>Icon 2: <User /></div>
      <div>Icon 3: <Settings /></div>
    </div>
  );
} 