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
  const handleCreateFormLink = async (e: React.MouseEvent) => {
    // Prevent event from propagating to parent form
    e.preventDefault();
    e.stopPropagation();
    
    if (!customerId) {
      setError("Δεν βρέθηκε ID πελάτη");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create form link using the default expiration time from the service
      const response: ApiResponse<any> = await createFormLinkForCustomerApi(
        customerId,
        undefined, // Use default expiration hours from the service (72 hours)
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
  const handleCopyLink = async (e: React.MouseEvent) => {
    // Prevent event from propagating to parent form
    e.preventDefault();
    e.stopPropagation();
    
    if (!formLinkData?.url) return;
    
    try {
      // Create a friendly HTML link that looks nicer when pasted
      const friendlyLinkHtml = `<a href="${formLinkData.url}" style="display:inline-block;background-color:#52796f;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;">Πατήστε εδώ για να συμπληρώσετε τα στοιχεία της προσφοράς</a>`;
      
      // For plain text fallback
      const plainTextLink = `Πατήστε εδώ για να συμπληρώσετε τα στοιχεία της προσφοράς: ${formLinkData.url}`;
      
      try {
        // Try to use the clipboard API with HTML content
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([friendlyLinkHtml], { type: 'text/html' }),
            'text/plain': new Blob([plainTextLink], { type: 'text/plain' })
          })
        ]);
      } catch (clipboardError) {
        // Fallback to plain text if HTML clipboard isn't supported
        await navigator.clipboard.writeText(plainTextLink);
      }
      
      setCopySuccess(true);
      
      toast({
        title: "Επιτυχία",
        description: "Ο σύνδεσμος αντιγράφηκε στο πρόχειρο",
      });
      
      // Reset copy success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      
      // Fallback to basic text copy if advanced clipboard fails
      try {
        await navigator.clipboard.writeText(formLinkData.url);
        setCopySuccess(true);
        toast({
          title: "Επιτυχία",
          description: "Ο σύνδεσμος αντιγράφηκε στο πρόχειρο (απλό κείμενο)",
        });
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackError) {
        toast({
          title: "Σφάλμα",
          description: "Αποτυχία αντιγραφής συνδέσμου στο πρόχειρο",
          variant: "destructive",
        });
      }
    }
  };
  
  // Handle opening Gmail compose
  const handleOpenGmail = (e: React.MouseEvent) => {
    // Prevent event from propagating to parent form
    e.preventDefault();
    e.stopPropagation();
    
    if (!formLinkData?.url) return;
    
    try {
      // Create a better Gmail URL that uses an HTML button in an anchor tag
      const formUrl = formLinkData.url;
      
      // Create nicer email subject
      const subject = "ΚΡΟΝΟΣ Α.Ε / Φόρμα συμπλήρωσης στοιχείων προσφοράς";
      
      // Determine recipient email address (if available)
      const recipientEmail = customerEmail || '';
      
      // Create HTML email with a styled button
      // Note: Gmail supports limited HTML in emails, so we use a simple styled anchor tag
      const htmlEmail = `
<html>
<body>
<p>Αγαπητέ Πελάτη,</p>
<p>Σας στέλνουμε αυτόν τον σύνδεσμο για να συμπληρώσετε τα στοιχεία σας για την προσφορά.</p>
<p style="text-align:center; margin:30px 0;">
  <a href="${formUrl}" style="display:inline-block; padding:12px 20px; background-color:#52796f; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:5px;">ΠΑΤΗΣΤΕ ΕΔΩ ΓΙΑ ΤΗ ΦΟΡΜΑ</a>
</p>
<p>Ο σύνδεσμος αυτός θα είναι ενεργός για 72 ώρες (3 ημέρες) από τη στιγμή που λάβατε αυτό το email.</p>
<p>Ευχαριστούμε,<br>Η ομάδα μας</p>
</body>
</html>`;

      // For Gmail compose with HTML body, we need to use a direct approach
      // We'll create a new mailto: URL with HTML content
      const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        `Αγαπητέ Πελάτη,

Σας στέλνουμε αυτόν τον σύνδεσμο για να συμπληρώσετε τα στοιχεία σας για την προσφορά.

ΠΑΤΗΣΤΕ ΕΔΩ ΓΙΑ ΤΗ ΦΟΡΜΑ:
${formUrl}

Ο σύνδεσμος αυτός θα είναι ενεργός για 72 ώρες (3 ημέρες) από τη στιγμή που λάβατε αυτό το email.

Ευχαριστούμε,
Η ομάδα μας`
      )}`;

      // Add recipient email to the Gmail URL if available
      const toParam = recipientEmail ? `&to=${encodeURIComponent(recipientEmail)}` : '';
      
      // Open Gmail compose with the URL
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&tf=1${toParam}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(`
Αγαπητέ Πελάτη,

Σας στέλνουμε αυτόν τον σύνδεσμο για να συμπληρώσετε τα στοιχεία σας για την προσφορά.

ΠΑΤΗΣΤΕ ΕΔΩ ΓΙΑ ΤΗ ΦΟΡΜΑ:
${formUrl}

Ο σύνδεσμος αυτός θα είναι ενεργός για 72 ώρες (3 ημέρες) από τη στιγμή που λάβατε αυτό το email.

Ευχαριστούμε,
Η ομάδα μας`)}`, "_blank");

    } catch (error) {
      console.error("Failed to open Gmail:", error);
      
      // Fallback to using the original gmailUrl if available
      if (formLinkData.gmailUrl) {
        window.open(formLinkData.gmailUrl, "_blank");
      } else {
        toast({
          title: "Σφάλμα",
          description: "Αποτυχία ανοίγματος του Gmail",
          variant: "destructive",
        });
      }
    }
  };
  
  // If form link has been created, show the success buttons
  if (formLinkData) {
    return (
      <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex space-x-2">
          <GlobalTooltip content="Άνοιγμα Gmail με το σύνδεσμο φόρμας">
            <Button
              onClick={handleOpenGmail}
              className="bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] h-9"
              size="sm"
              aria-label="Άνοιγμα Gmail"
              type="button"
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
              type="button"
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
    <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
      <GlobalTooltip content="Δημιουργία συνδέσμου φόρμας πελάτη">
        <Button
          onClick={handleCreateFormLink}
          disabled={loading}
          className={`bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] h-9 ${className}`}
          size="sm"
          aria-label="Δημιουργία συνδέσμου φόρμας πελάτη"
          type="button"
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