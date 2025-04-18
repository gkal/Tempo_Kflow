import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink, Copy, Check, AlertCircle } from "lucide-react";
import { createFormLinkForCustomerApi, FormLinkCreationResponse } from "@/services/formApiService";
import { ApiResponse, ApiError } from "@/utils/apiUtils";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/Loader";

interface SendFormLinkButtonProps {
  customerId: string;
  className?: string;
  onSuccess?: (formLinkData: {
    token: string;
    url: string;
    gmailUrl: string;
    expiresAt: string;
  }) => void;
  onCopyToClipboard?: (url: string) => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  withLabel?: boolean;
  emailRecipient?: string;
  expirationHours?: number;
}

/**
 * Button component to send a form link to a customer
 * Uses the formApiService to create a form link and provides options
 * to open Gmail compose or copy the link to clipboard
 */
export default function SendFormLinkButton({
  customerId,
  className,
  onSuccess,
  onCopyToClipboard,
  size = "default",
  variant = "default",
  withLabel = true,
  emailRecipient,
  expirationHours = 72,
}: SendFormLinkButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formLinkData, setFormLinkData] = useState<{
    token: string;
    url: string;
    gmailUrl: string;
    expiresAt: string;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Handle button click
  const handleSendFormLink = async () => {
    if (!customerId) {
      setError("Δεν βρέθηκε ID πελάτη");
      return;
    }
    
    setLoading(true);
    setError(null);
    setFormLinkData(null);
    
    try {
      // Call the API to create a form link
      const response: ApiResponse<FormLinkCreationResponse> = await createFormLinkForCustomerApi(
        customerId,
        expirationHours,
        false, // Don't send email automatically
        emailRecipient,
        user?.id
      );
      
      if (response.status === 'success' && response.data) {
        const { formLink, gmailUrl } = response.data;
        
        // Set the form link data
        const linkData = {
          token: formLink.token,
          url: formLink.url,
          gmailUrl,
          expiresAt: formLink.expires_at,
        };
        
        setFormLinkData(linkData);
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(linkData);
        }
      } else {
        const errorMessage = response.error?.message || "Αποτυχία δημιουργίας συνδέσμου φόρμας";
        setError(errorMessage);
      }
    } catch (err) {
      setError("Προέκυψε ένα απρόσμενο σφάλμα");
      console.error("Error creating form link:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle opening Gmail compose
  const handleOpenGmail = () => {
    if (formLinkData?.gmailUrl) {
      window.open(formLinkData.gmailUrl, "_blank");
    }
  };
  
  // Handle copying link to clipboard
  const handleCopyLink = async () => {
    if (formLinkData?.url) {
      try {
        await navigator.clipboard.writeText(formLinkData.url);
        setCopySuccess(true);
        
        // Call onCopyToClipboard callback if provided
        if (onCopyToClipboard) {
          onCopyToClipboard(formLinkData.url);
        }
        
        // Reset copy success message after 2 seconds
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
        setError("Αποτυχία αντιγραφής συνδέσμου");
      }
    }
  };
  
  // Show success actions if form link was created
  if (formLinkData) {
    return (
      <div className="flex flex-col space-y-3">
        <div className="text-sm text-[#cad2c5] mb-1">
          Ο σύνδεσμος φόρμας δημιουργήθηκε με επιτυχία! Επιλέξτε μια ενέργεια:
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleOpenGmail}
            variant="secondary"
            size={size}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Άνοιγμα Gmail
          </Button>
          
          <Button
            onClick={handleCopyLink}
            variant="outline"
            size={size}
            className="gap-2"
          >
            {copySuccess ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copySuccess ? "Αντιγράφηκε!" : "Αντιγραφή Συνδέσμου"}
          </Button>
        </div>
        
        <div className="text-xs text-[#cad2c5]/70 mt-1">
          Ο σύνδεσμος λήγει: {new Date(formLinkData.expiresAt).toLocaleString('el-GR')}
        </div>
      </div>
    );
  }
  
  // Show error message if there was an error
  if (error) {
    return (
      <div className="flex flex-col space-y-2">
        <div className="flex items-center text-red-500 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
        
        <Button
          onClick={() => {
            setError(null);
            handleSendFormLink();
          }}
          variant="outline"
          size={size}
          className="gap-2 mt-1"
        >
          Προσπαθήστε ξανά
        </Button>
      </div>
    );
  }
  
  // Default button
  return (
    <Button
      onClick={handleSendFormLink}
      disabled={loading}
      variant={variant}
      size={size}
      className={cn(
        "gap-2 focus:ring-2 focus:ring-[#52796f] focus:ring-offset-2",
        className
      )}
      aria-label="Αποστολή συνδέσμου φόρμας στον πελάτη"
      tabIndex={0}
    >
      {loading ? (
        <Loader size={16} />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      
      {withLabel && (loading ? "Αποστολή..." : "Αποστολή Φόρμας")}
    </Button>
  );
} 
