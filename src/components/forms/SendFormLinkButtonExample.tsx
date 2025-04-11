import React from "react";
import SendFormLinkButton from "./SendFormLinkButton";

interface CustomerFormButtonExampleProps {
  customerId: string;
  customerName: string;
  customerEmail?: string;
}

/**
 * Example component showing how to use the SendFormLinkButton
 * within a customer detail page
 */
export default function SendFormLinkButtonExample({
  customerId,
  customerName,
  customerEmail,
}: CustomerFormButtonExampleProps) {
  // Handle successful form link creation
  const handleFormLinkSuccess = (formLinkData: {
    token: string;
    url: string;
    gmailUrl: string;
    expiresAt: string;
  }) => {
    console.log("Form link created:", formLinkData);
    // You can add additional logic here, such as updating UI or sending notifications
  };

  return (
    <div className="p-4 border border-[#52796f]/30 rounded-md bg-[#2f3e46] mb-4">
      <h3 className="text-lg font-medium text-[#cad2c5] mb-3">
        {customerName} - Αποστολή Φόρμας
      </h3>
      
      <div className="text-sm text-[#cad2c5]/80 mb-4">
        Δημιουργήστε έναν σύνδεσμο φόρμας για τον πελάτη και στείλτε τον μέσω email.
        Ο σύνδεσμος θα επιτρέψει στον πελάτη να συμπληρώσει τις απαραίτητες πληροφορίες.
      </div>
      
      <SendFormLinkButton 
        customerId={customerId}
        emailRecipient={customerEmail}
        expirationHours={72}
        onSuccess={handleFormLinkSuccess}
      />
      
      <div className="mt-4 text-xs text-[#cad2c5]/50">
        Ο σύνδεσμος θα λήξει σε 72 ώρες από τη στιγμή της δημιουργίας του.
      </div>
    </div>
  );
} 