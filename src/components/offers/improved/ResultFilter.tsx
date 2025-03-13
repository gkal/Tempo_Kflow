import React from "react";

interface ResultFilterProps {
  resultFilter: string;
  onResultChange: (result: string) => void;
}

export function ResultFilter({ resultFilter, onResultChange }: ResultFilterProps) {
  return (
    <div className="flex space-x-2 items-center">
      <div className="text-[#cad2c5] text-sm mr-1">
        Αποτέλεσμα:
      </div>
      
      <div 
        onClick={() => onResultChange("all")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${resultFilter === "all" 
            ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(96,165,250,0.3)] ring-blue-400/50" 
            : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
        >
          Όλα
        </span>
      </div>
      
      <div 
        onClick={() => onResultChange("success")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${resultFilter === "success" 
            ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
            : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
        >
          Επιτυχία
        </span>
      </div>
      
      <div 
        onClick={() => onResultChange("failed")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${resultFilter === "failed" 
            ? "bg-red-500/20 text-red-400 font-medium shadow-[0_0_8px_2px_rgba(248,113,113,0.3)] ring-red-400/50" 
            : "bg-red-500/10 text-red-400 hover:bg-red-500/20 ring-transparent"}`}
        >
          Αποτυχία
        </span>
      </div>
      
      <div 
        onClick={() => onResultChange("pending")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${resultFilter === "pending" 
            ? "bg-purple-500/20 text-purple-400 font-medium shadow-[0_0_8px_2px_rgba(168,85,247,0.3)] ring-purple-400/50" 
            : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 ring-transparent"}`}
        >
          Σε εξέλιξη
        </span>
      </div>
      
      <div 
        onClick={() => onResultChange("none")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${resultFilter === "none" 
            ? "bg-gray-500/20 text-gray-400 font-medium shadow-[0_0_8px_2px_rgba(156,163,175,0.3)] ring-gray-400/50" 
            : "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 ring-transparent"}`}
        >
          Κανένα
        </span>
      </div>
    </div>
  );
} 