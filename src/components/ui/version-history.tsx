import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { VERSION_HISTORY } from "@/lib/version";

interface VersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistory({ open, onOpenChange }: VersionHistoryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-[#2f3e46] border-[#52796f] text-[#cad2c5] max-w-2xl"
        aria-labelledby="version-history-title"
        aria-describedby="version-history-description"
      >
        <DialogHeader>
          <DialogTitle id="version-history-title" className="text-xl font-bold text-[#cad2c5] flex items-center justify-between">
            <span>Ιστορικό Εκδόσεων</span>
            <DialogClose asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-[#84a98c] hover:text-[#cad2c5] hover:bg-[#354f52]"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogTitle>
          <DialogDescription id="version-history-description" className="text-[#84a98c]">
            Ιστορικό αλλαγών και ενημερώσεων της εφαρμογής
          </DialogDescription>
        </DialogHeader>

        <div 
          className="overflow-y-auto scrollbar-visible pr-1"
          style={{ maxHeight: "calc(70vh - 8rem)" }}
        >
          <div className="space-y-6 mt-4">
            {VERSION_HISTORY.slice().reverse().map((entry, index) => (
              <div key={entry.version} className="border-b border-[#52796f] pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-[#a8c5b5] flex items-center">
                    <span>v{entry.version}</span>
                    {index === 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[#84a98c]/20 text-[#84a98c] border border-[#84a98c]/30">
                        Τρέχουσα
                      </span>
                    )}
                  </h3>
                  <span className="text-sm text-[#84a98c]">{entry.date}</span>
                </div>
                <p className="text-[#cad2c5] font-medium mb-2">{entry.description}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-[#a8c5b5] text-sm">
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
