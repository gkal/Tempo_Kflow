import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, ExternalLink, Copy, Check, AlertCircle } from "lucide-react";
import { createFormLinkForCustomerApi } from "@/services/formApiService";
import { ApiResponse } from "@/utils/apiUtils";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { GlobalTooltip } from "@/components/ui/GlobalTooltip";
import { Loader } from "@/components/ui/Loader";

interface CustomerFormLinkButtonProps {
  customerId: string;
  customerEmail?: string;
  className?: string;
}

/**
 * A simplified version of SendFormLinkButton designed for customer details page
 * It displays an icon-only button with tooltip and shows toast notifications
 */
export default function CustomerFormLinkButton({
  customerId,
  customerEmail,
  className,
}: CustomerFormLinkButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formLinkData, setFormLinkData] = useState<{
    url: string;
    gmailUrl: string;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Reset success message after 2 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);
  
  // Handle button click to create form link
  const handleCreateFormLink = async () => {
    if (!customerId) {
      setError("Δεν βρέθηκε ID πελάτη");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create form link with 72 hour expiration by default
      const response: ApiResponse<any> = await createFormLinkForCustomerApi(
        customerId,
        72, // 72 hours expiration
        false, // Don't send email automatically
        customerEmail,
        user?.id
      );
      
      if (response.status === 'success' && response.data) {
        const { formLink, gmailUrl } = response.data;
        
        // Set the form link data to display the success state
        setFormLinkData({
          url: formLink.url,
          gmailUrl
        });
        
        // Show success message for 2 seconds
        setShowSuccessMessage(true);
        
        // Show success toast
        toast({
          title: "Επιτυχία",
          description: "Ο σύνδεσμος φόρμας δημιουργήθηκε επιτυχώς",
        });
      } else {
        const errorMessage = response.error?.message || "Αποτυχία δημιουργίας συνδέσμου φόρμας";
        setError(errorMessage);
        
        toast({
          title: "Σφάλμα",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error creating form link:", err);
      setError("Προέκυψε απρόσμενο σφάλμα κατά τη δημιουργία του συνδέσμου");
      
      toast({
        title: "Σφάλμα",
        description: "Προέκυψε απρόσμενο σφάλμα κατά τη δημιουργία του συνδέσμου",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle copying link to clipboard
  const handleCopyLink = async () => {
    if (!formLinkData?.url) return;
    
    try {
      await navigator.clipboard.writeText(formLinkData.url);
      setCopySuccess(true);
      
      toast({
        title: "Επιτυχία",
        description: "Ο σύνδεσμος αντιγράφηκε στο πρόχειρο",
      });
      
      // Reset copy success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία αντιγραφής συνδέσμου στο πρόχειρο",
        variant: "destructive",
      });
    }
  };
  
  // Handle opening Gmail compose
  const handleOpenGmail = () => {
    if (!formLinkData?.gmailUrl) return;
    window.open(formLinkData.gmailUrl, "_blank");
  };
  
  // If form link has been created, show the success buttons
  if (formLinkData) {
    return (
      <div className="flex flex-col">
        <div className="flex space-x-2">
          <GlobalTooltip content="Άνοιγμα Gmail με το σύνδεσμο φόρμας">
            <Button
              onClick={handleOpenGmail}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] h-9"
              size="sm"
              aria-label="Άνοιγμα Gmail"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Gmail
            </Button>
          </GlobalTooltip>
          
          <GlobalTooltip content={copySuccess ? "Αντιγράφηκε!" : "Αντιγραφή συνδέσμου στο πρόχειρο"}>
            <Button
              onClick={handleCopyLink}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] h-9"
              size="sm"
              aria-label="Αντιγραφή συνδέσμου φόρμας"
            >
              {copySuccess ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Αντιγραφή
            </Button>
          </GlobalTooltip>
        </div>
        
        {/* Success message */}
        {showSuccessMessage && (
          <div className="text-green-400 text-xs mt-1 text-center">
            Ο σύνδεσμος δημιουργήθηκε επιτυχώς
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col">
      <GlobalTooltip content="Δημιουργία συνδέσμου φόρμας πελάτη">
        <Button
          onClick={handleCreateFormLink}
          disabled={loading}
          className={`bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] h-9 ${className}`}
          size="sm"
          aria-label="Δημιουργία συνδέσμου φόρμας πελάτη"
        >
          {loading ? (
            <Loader size={16} />
          ) : (
            <LinkIcon className="h-4 w-4 mr-2" />
          )}
          Link
        </Button>
      </GlobalTooltip>
      
      {/* Error message */}
      {error && (
        <div className="flex items-center text-red-500 text-xs mt-1">
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
} 