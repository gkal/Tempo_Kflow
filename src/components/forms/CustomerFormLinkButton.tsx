import React, { useState } from "react";
import SendFormLinkButton from "./SendFormLinkButton";
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";

interface CustomerFormLinkButtonProps {
  customerId: string;
  customerEmail?: string;
}

/**
 * Customer Form Link Button component optimized for the customer detail page
 * Shows a compact button with a tooltip but doesn't use toasts
 */
export default function CustomerFormLinkButton({
  customerId,
  customerEmail,
}: CustomerFormLinkButtonProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle successful form link creation without using toast
  const handleFormLinkSuccess = (formLinkData: {
    token: string;
    url: string;
    gmailUrl: string;
    expiresAt: string;
  }) => {
    // Just set a success message state
    setSuccessMessage("Σύνδεσμος φόρμας δημιουργήθηκε με επιτυχία");
    
    // Auto-clear message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Handle clipboard copy without using toast
  const handleCopyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setSuccessMessage("Ο σύνδεσμος αντιγράφηκε στο πρόχειρο");
    
    // Auto-clear message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <GlobalTooltip content="Δημιουργία και αποστολή συνδέσμου φόρμας πελάτη">
      <div className="relative">
        <SendFormLinkButton 
          customerId={customerId}
          emailRecipient={customerEmail}
          expirationHours={72}
          onSuccess={handleFormLinkSuccess}
          onCopyToClipboard={handleCopyToClipboard}
          size="sm"
          withLabel={false}
        />
        
        {/* Subtle success message shown directly in the UI */}
        {successMessage && (
          <div className="absolute -bottom-8 right-0 whitespace-nowrap bg-[#354f52] text-[#cad2c5] text-xs py-1 px-2 rounded shadow-md">
            {successMessage}
          </div>
        )}
      </div>
    </GlobalTooltip>
  );
} 