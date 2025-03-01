import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ContactCard } from "./ContactCard";

interface ContactListProps {
  contacts: any[];
  primaryContactId?: string;
  onContactClick: (contact: any) => void;
  onAddContact: () => void;
  className?: string;
  maxHeight?: string;
}

export function ContactList({
  contacts = [],
  primaryContactId,
  onContactClick,
  onAddContact,
  onSetPrimary,
  className = "",
  maxHeight = "max-h-[300px]",
}: ContactListProps & { onSetPrimary?: (contactId: string) => void }) {
  // Sort contacts: primary contact first, then alphabetically by name
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.id === primaryContactId) return -1;
    if (b.id === primaryContactId) return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <div className={className}>
      <div
        className={`space-y-1 overflow-auto ${maxHeight} pr-1 scrollbar-visible`}
      >
        {sortedContacts.length > 0 ? (
          sortedContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isPrimary={contact.id === primaryContactId}
              onClick={() => onContactClick(contact)}
              onSetPrimary={
                onSetPrimary ? () => onSetPrimary(contact.id) : undefined
              }
            />
          ))
        ) : (
          <div className="text-center text-[#84a98c] py-4">
            Δεν υπάρχουν επαφές
          </div>
        )}
      </div>
    </div>
  );
}
