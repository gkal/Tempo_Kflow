import React from "react";

interface StatusFilterProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export function StatusFilter({ statusFilter, onStatusChange }: StatusFilterProps) {
  return (
    <div className="flex space-x-2 items-center">
      <div className="text-[#cad2c5] text-sm mr-1">
        Κατάσταση:
      </div>
      
      <div 
        onClick={() => onStatusChange("all")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${statusFilter === "all" 
            ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(96,165,250,0.3)] ring-blue-400/50" 
            : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
        >
          Όλες
        </span>
      </div>
      
      <div 
        onClick={() => onStatusChange("wait_for_our_answer")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${statusFilter === "wait_for_our_answer" 
            ? "bg-yellow-500/20 text-yellow-400 font-medium shadow-[0_0_8px_2px_rgba(234,179,8,0.3)] ring-yellow-400/50" 
            : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 ring-transparent"}`}
        >
          Αναμονή μας
        </span>
      </div>
      
      <div 
        onClick={() => onStatusChange("wait_for_customer_answer")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${statusFilter === "wait_for_customer_answer" 
            ? "bg-blue-500/20 text-blue-400 font-medium shadow-[0_0_8px_2px_rgba(96,165,250,0.3)] ring-blue-400/50" 
            : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 ring-transparent"}`}
        >
          Αναμονή πελάτη
        </span>
      </div>
      
      <div 
        onClick={() => onStatusChange("ready")}
        className="relative inline-block min-w-[70px]"
      >
        <span className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all ring-1 block text-center
          ${statusFilter === "ready" 
            ? "bg-green-500/20 text-green-400 font-medium shadow-[0_0_8px_2px_rgba(74,222,128,0.3)] ring-green-400/50" 
            : "bg-green-500/10 text-green-400 hover:bg-green-500/20 ring-transparent"}`}
        >
          Ολοκληρωμένες
        </span>
      </div>
    </div>
  );
} 