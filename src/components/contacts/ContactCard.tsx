import React, { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Mail, Building, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomDropdown } from "@/components/ui/custom-dropdown";

interface ContactCardProps {
  contact: {
    id: string;
    full_name: string;
    position?: string;
    telephone?: string;
    mobile?: string;
    email?: string;
    internal_telephone?: string;
    contact_type?: string;
  };
  isPrimary?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ContactCard({
  contact,
  isPrimary = false,
  onClick,
  className,
  onSetPrimary,
}: ContactCardProps & { onSetPrimary?: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  // Generate initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return name[0] || "?";
  };

  // Generate avatar color based on name
  const generateAvatarColor = (name: string) => {
    if (!name) return "hsl(200, 70%, 50%)";
    const hash = name.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div
      className={cn(
        "flex items-center p-2 hover:bg-[#2f3e46] rounded-lg transition-colors",
        isPrimary ? "bg-[#2f3e46]/70 border border-[#52796f]/50" : "",
        onClick ? "cursor-pointer" : "",
        className,
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className="h-10 w-10 mr-3">
        <AvatarFallback
          style={{
            backgroundColor: generateAvatarColor(contact.full_name),
          }}
          className="text-[#2f3e46] text-sm font-medium"
        >
          {getInitials(contact.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[#a8c5b5] flex items-center justify-between w-full">
          <div className="flex items-center">
            {contact.full_name}
            {isPrimary && (
              <span className="ml-2 text-xs bg-[#52796f]/30 text-[#84a98c] px-1.5 py-0.5 rounded-full flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Κύρια
              </span>
            )}
          </div>
          {onSetPrimary && !isPrimary && isHovered && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSetPrimary();
              }}
              className="ml-2 flex items-center"
            >
              <div className="w-5 h-5 rounded-full border border-[#84a98c] cursor-pointer hover:bg-[#52796f]/20 flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#84a98c"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          )}
        </div>
        {contact.position && (
          <div className="text-xs text-[#84a98c] flex items-center">
            <Building className="h-3 w-3 mr-1" />
            {contact.position}
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 mt-1">
          {contact.telephone && (
            <div className="text-xs text-[#84a98c] flex items-center">
              <Phone className="h-3 w-3 mr-1" />
              {contact.telephone}
            </div>
          )}
          {contact.email && (
            <div className="text-xs text-[#84a98c] flex items-center truncate">
              <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
