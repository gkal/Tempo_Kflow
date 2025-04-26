import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, ExternalLink, Copy, Check, AlertCircle } from "lucide-react";
import { createFormLinkForCustomerApi, getActiveFormLinksForCustomerApi } from "@/services/formApiService";
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
  const [checkingExistingLinks, setCheckingExistingLinks] = useState(true);
  
  // Check for existing active form links on component mount
  useEffect(() => {
    const checkExistingLinks = async () => {
      if (!customerId) return;
      
      try {
        // Check for active links in the database - always query the database for the latest state
        const response: ApiResponse<any> = await getActiveFormLinksForCustomerApi(customerId);
        
        if (response.status === 'success' && response.data) {
          // Validate the response data before setting state
          if (response.data.url && typeof response.data.url === 'string') {
            // Found an active link, set it as the current link
            setFormLinkData(response.data);
          }
        }
      } catch (err) {
        // Error handling remains silent without logs
      } finally {
        setCheckingExistingLinks(false);
      }
    };
    
    checkExistingLinks();
  }, [customerId]);
  
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
        
        // Validate the URL before setting state
        if (!formLink || !formLink.url || typeof formLink.url !== 'string') {
          throw new Error("API returned invalid form link data");
        }
        
        // Set the form link data to display the success state
        const linkData = {
          url: formLink.url,
          gmailUrl: gmailUrl || ''
        };
        
        setFormLinkData(linkData);
        
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
    
    if (!formLinkData?.url) {
      toast({
        title: "Σφάλμα",
        description: "Δεν υπάρχει διαθέσιμος σύνδεσμος για αντιγραφή",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure the URL is valid and not undefined
    let formUrl = formLinkData.url;
    
    // Extra validation to ensure URL is defined and valid
    if (!formUrl || typeof formUrl !== 'string') {
      toast({
        title: "Σφάλμα",
        description: "Ο σύνδεσμος φόρμας είναι μη έγκυρος",
        variant: "destructive",
      });
      return;
    }
    
    // Fix the URL if it starts with "undefined/"
    if (formUrl.startsWith("undefined/")) {
      // Extract the token part from the URL
      const urlParts = formUrl.split('/');
      if (urlParts.length >= 2) {
        const formToken = urlParts[1]; // This should be "form"
        const tokenValue = urlParts[2]; // This should be the actual token
        
        // Always use the external URL format with custkflow.vercel.app
        formUrl = `https://custkflow.vercel.app/form/${tokenValue}`;
      }
    }
    
    try {
      // Create a friendly HTML link that looks nicer when pasted
      const friendlyLinkHtml = `<a href="${formUrl}" style="display:inline-block;background-color:#52796f;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;">Πατήστε εδώ για να συμπληρώσετε τα στοιχεία της προσφοράς</a>`;
      
      // For plain text fallback
      const plainTextLink = `Πατήστε εδώ για να συμπληρώσετε τα στοιχεία της προσφοράς: ${formUrl}`;
      
      let copySucceeded = false;
      
      // Method 1: Try to use modern clipboard API with HTML content
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([friendlyLinkHtml], { type: 'text/html' }),
            'text/plain': new Blob([plainTextLink], { type: 'text/plain' })
          })
        ]);
        copySucceeded = true;
      } catch (clipboardError) {
        // Silent error handling
      }
      
      // Method 2: Try to use simple clipboard API (widest browser support)
      if (!copySucceeded) {
        try {
          await navigator.clipboard.writeText(plainTextLink);
          copySucceeded = true;
        } catch (clipboardError2) {
          // Silent error handling
        }
      }
      
      // Method 3: Use document.execCommand (older browsers)
      if (!copySucceeded) {
        try {
          // Create a temporary textarea element
          const textarea = document.createElement('textarea');
          textarea.value = plainTextLink;
          
          // Make it invisible but part of the document
          textarea.style.position = 'absolute';
          textarea.style.left = '-9999px';
          textarea.style.top = '0';
          document.body.appendChild(textarea);
          
          // Select and copy
          textarea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          
          if (successful) {
            copySucceeded = true;
          }
        } catch (execCommandError) {
          // Silent error handling
        }
      }
      
      if (copySucceeded) {
        setCopySuccess(true);
        
        toast({
          title: "Επιτυχία",
          description: "Ο σύνδεσμος αντιγράφηκε στο πρόχειρο",
        });
        
        // Reset copy success state after 2 seconds
        setTimeout(() => setCopySuccess(false), 2000);
      } else {
        throw new Error("All clipboard methods failed");
      }
    } catch (err) {
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία αντιγραφής συνδέσμου στο πρόχειρο. Προσπαθήστε να δώσετε άδεια στο πρόγραμμα περιήγησης για πρόσβαση στο πρόχειρο.",
        variant: "destructive",
      });
    }
  };
  
  // Handle opening Gmail compose
  const handleOpenGmail = async (e: React.MouseEvent) => {
    // Prevent event from propagating to parent form
    e.preventDefault();
    e.stopPropagation();
    
    if (!formLinkData?.url) {
      toast({
        title: "Σφάλμα",
        description: "Δεν υπάρχει διαθέσιμος σύνδεσμος",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Create a better Gmail URL that uses an HTML button in an anchor tag
      let formUrl = formLinkData.url;
      
      // Extra validation to ensure URL is defined
      if (!formUrl) {
        toast({
          title: "Σφάλμα",
          description: "Ο σύνδεσμος φόρμας είναι μη έγκυρος",
          variant: "destructive",
        });
        return;
      }
      
      // Fix the URL if it starts with "undefined/"
      if (formUrl.startsWith("undefined/")) {
        // Extract the token part from the URL
        const urlParts = formUrl.split('/');
        if (urlParts.length >= 2) {
          const formToken = urlParts[1]; // This should be "form"
          const tokenValue = urlParts[2]; // This should be the actual token
          
          // Always use the external URL format with custkflow.vercel.app
          formUrl = `https://custkflow.vercel.app/form/${tokenValue}`;
        }
      }
      
      // First, automatically copy the formatted HTML link to clipboard for easy pasting
      // Create a friendly HTML link that looks nicer when pasted - same as in handleCopyLink
      const friendlyLinkHtml = `<a href="${formUrl}" style="display:inline-block;background-color:#52796f;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:4px;font-family:Arial,sans-serif;">Πατήστε εδώ για να συμπληρώσετε τα στοιχεία της προσφοράς</a>`;
      
      // For plain text fallback
      const plainTextLink = `Πατήστε εδώ για να συμπληρώσετε τα στοιχεία της προσφοράς: ${formUrl}`;
      
      let copySucceeded = false;
      
      // Method 1: Try to use modern clipboard API with HTML content
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([friendlyLinkHtml], { type: 'text/html' }),
            'text/plain': new Blob([plainTextLink], { type: 'text/plain' })
          })
        ]);
        copySucceeded = true;
      } catch (clipErr) {
        // Silent error handling
      }
      
      // Method 2: Try to use simple clipboard API (widest browser support)
      if (!copySucceeded) {
        try {
          await navigator.clipboard.writeText(plainTextLink);
          copySucceeded = true;
        } catch (clipErr) {
          // Silent error handling
        }
      }
      
      // Method 3: Use document.execCommand (older browsers)
      if (!copySucceeded) {
        try {
          // Create a temporary textarea element
          const textarea = document.createElement('textarea');
          textarea.value = plainTextLink;
          
          // Make it invisible but part of the document
          textarea.style.position = 'absolute';
          textarea.style.left = '-9999px';
          textarea.style.top = '0';
          document.body.appendChild(textarea);
          
          // Select and copy
          textarea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          
          if (successful) {
            copySucceeded = true;
          }
        } catch (execCommandErr) {
          // Silent error handling
        }
      }
      
      if (copySucceeded) {
        setCopySuccess(true);
        
        // Show a small toast notification that the link is ready to paste
        toast({
          title: "Έτοιμο για επικόλληση",
          description: "Ο σύνδεσμος αντιγράφηκε και είναι έτοιμος για επικόλληση",
        });
        
        // Reset copy success state after 5 seconds
        setTimeout(() => setCopySuccess(false), 5000);
      }
      
      // Create nicer email subject
      const subject = "ΚΡΟΝΟΣ Α.Ε / Φόρμα συμπλήρωσης στοιχείων προσφοράς";
      
      // Determine recipient email address (if available)
      const recipientEmail = customerEmail || '';
      
      // Prepare the email body content with the form URL
      const emailBodyContent = `
Αγαπητέ Πελάτη,

Σας στέλνουμε αυτόν τον σύνδεσμο για να συμπληρώσετε τα στοιχεία σας για την προσφορά.

ΠΑΤΗΣΤΕ ΕΔΩ ΓΙΑ ΤΗ ΦΟΡΜΑ:
${formUrl}

Ο σύνδεσμος αυτός θα είναι ενεργός για 72 ώρες (3 ημέρες) από τη στιγμή που λάβατε αυτό το email.

Ευχαριστούμε,
Η ομάδα μας`;
      
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
      const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBodyContent)}`;

      // Add recipient email to the Gmail URL if available
      const toParam = recipientEmail ? `&to=${encodeURIComponent(recipientEmail)}` : '';
      
      // Open Gmail compose with the URL - using the same emailBodyContent to ensure consistency
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&tf=1${toParam}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBodyContent)}`, "_blank");

    } catch (error) {
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
  
  // If still checking for existing links, show loading state
  if (checkingExistingLinks) {
    return (
      <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
        <Button
          disabled={true}
          className={`bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5] h-9 ${className}`}
          size="sm"
          aria-label="Έλεγχος συνδέσμων φόρμας"
          type="button"
        >
          <Loader size={16} />
        </Button>
      </div>
    );
  }
  
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
  
  // If no form link exists, show the create link button
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