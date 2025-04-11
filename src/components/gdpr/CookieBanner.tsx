import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GDPRConsentGroup } from '@/components/gdpr/ConsentCheckbox';
import { gdprComplianceService } from '@/services/gdprComplianceService';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CookieBannerProps {
  userId?: string;
  customerId?: string;
  className?: string;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({
  userId,
  customerId,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [agreement, setAgreement] = useState<any>(null);
  const [consents, setConsents] = useState<Record<string, boolean>>({
    necessary: true,
    marketing: false,
    analytics: false,
    third_party: false,
    data_processing: true,
  });
  const router = useRouter();

  useEffect(() => {
    // Check if the user has already consented
    const hasConsented = localStorage.getItem('cookie-consent');
    if (!hasConsented) {
      // Delay showing the banner for 2 seconds for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    
    // Fetch active agreement on mount
    fetchActiveAgreement();
  }, []);
  
  const fetchActiveAgreement = async () => {
    try {
      const agreement = await gdprComplianceService.getActiveDataProcessingAgreement();
      if (agreement) {
        setAgreement(agreement);
      }
    } catch (error) {
      console.error('Error fetching agreement:', error);
    }
  };
  
  const handleAcceptAll = async () => {
    setIsVisible(false);
    
    // Set all consents to true except those already set
    const allConsents = {
      ...consents,
      marketing: true,
      analytics: true,
      third_party: true,
      data_processing: true,
    };
    
    setConsents(allConsents);
    
    // Save consent in localStorage
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(allConsents));
    
    // Record consents in database if we have a user or customer ID
    if (agreement && (userId || customerId)) {
      try {
        for (const [type, value] of Object.entries(allConsents)) {
          if (value) { // Only record accepted consents
            await gdprComplianceService.recordConsent({
              agreement_id: agreement.id,
              user_id: userId || '',
              customer_id: customerId,
              consent_type: type as any,
              status: 'granted',
              consent_date: new Date().toISOString(),
              ip_address: window.location.hostname,
            });
          }
        }
      } catch (error) {
        console.error('Error recording consent:', error);
      }
    }
  };
  
  const handleRejectNonEssential = () => {
    setIsVisible(false);
    
    // Only accept necessary cookies
    const necessaryOnly = {
      ...consents,
      marketing: false,
      analytics: false,
      third_party: false,
      data_processing: true, // Data processing is required
    };
    
    setConsents(necessaryOnly);
    
    // Save consent in localStorage
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(necessaryOnly));
    
    // Record consents in database if we have a user or customer ID
    if (agreement && (userId || customerId)) {
      try {
        // Record data processing as granted (required)
        gdprComplianceService.recordConsent({
          agreement_id: agreement.id,
          user_id: userId || '',
          customer_id: customerId,
          consent_type: 'data_processing',
          status: 'granted',
          consent_date: new Date().toISOString(),
          ip_address: window.location.hostname,
        });
        
        // Record others as denied
        for (const type of ['marketing', 'analytics', 'third_party']) {
          gdprComplianceService.recordConsent({
            agreement_id: agreement.id,
            user_id: userId || '',
            customer_id: customerId,
            consent_type: type as any,
            status: 'denied',
            consent_date: new Date().toISOString(),
            ip_address: window.location.hostname,
          });
        }
      } catch (error) {
        console.error('Error recording consent:', error);
      }
    }
  };
  
  const handleSavePreferences = () => {
    setIsVisible(false);
    setShowPreferences(false);
    
    // Save consent in localStorage
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(consents));
    
    // Record consents in database if we have a user or customer ID
    if (agreement && (userId || customerId)) {
      try {
        for (const [type, value] of Object.entries(consents)) {
          gdprComplianceService.recordConsent({
            agreement_id: agreement.id,
            user_id: userId || '',
            customer_id: customerId,
            consent_type: type as any,
            status: value ? 'granted' : 'denied',
            consent_date: new Date().toISOString(),
            ip_address: window.location.hostname,
          });
        }
      } catch (error) {
        console.error('Error recording consent:', error);
      }
    }
  };
  
  const handleConsentsChange = (newConsents: Record<string, boolean>) => {
    setConsents(newConsents);
  };
  
  const handlePrivacyPolicyClick = () => {
    router.push('/gdpr/privacy-policy');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div className={cn(
        'fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50',
        className
      )}>
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-medium">Cookie Consent</h3>
              <p className="text-xs text-muted-foreground">
                We use cookies to enhance your browsing experience, serve personalized ads, and analyze our traffic.
                By clicking "Accept All", you consent to our use of cookies as described in our{' '}
                <button 
                  onClick={handlePrivacyPolicyClick}
                  className="text-primary underline font-medium"
                >
                  Privacy Policy
                </button>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPreferences(true)}
                className="flex-1 md:flex-none"
              >
                Customize
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRejectNonEssential}
                className="flex-1 md:flex-none"
              >
                Reject All
              </Button>
              <Button 
                size="sm" 
                onClick={handleAcceptAll}
                className="flex-1 md:flex-none"
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preferences dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Choose which cookies you want to accept. Your choices will be saved for one year.
            </DialogDescription>
          </DialogHeader>
          
          {agreement && (
            <div className="py-4">
              <GDPRConsentGroup
                agreementId={agreement.id}
                userId={userId}
                customerId={customerId}
                onConsentsChange={handleConsentsChange}
              />
            </div>
          )}
          
          <DialogFooter className="flex flex-col md:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleRejectNonEssential}
              className="w-full md:w-auto"
            >
              Reject All
            </Button>
            <Button 
              variant="outline" 
              onClick={handleAcceptAll}
              className="w-full md:w-auto"
            >
              Accept All
            </Button>
            <Button 
              onClick={handleSavePreferences}
              className="w-full md:w-auto"
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieBanner; 