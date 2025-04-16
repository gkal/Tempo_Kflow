import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsentCheckbox } from '@/components/gdpr/ConsentCheckbox';
import { gdprComplianceService, ConsentRecord } from '@/services/gdprComplianceService';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsentRequiredProps {
  userId?: string;
  customerId?: string;
  consentType: ConsentRecord['consent_type'];
  title: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * A component that only renders its children if the user has given consent for a specific purpose.
 * If the user hasn't given consent, it shows a consent form instead.
 */
export const ConsentRequired: React.FC<ConsentRequiredProps> = ({
  userId,
  customerId,
  consentType,
  title,
  description,
  children,
  fallback,
  className,
}) => {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [agreement, setAgreement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    // Don't check for consent if no user ID or customer ID provided
    if (!userId && !customerId) {
      setIsLoading(false);
      setHasConsent(false);
      return;
    }
    
    checkConsent();
    fetchActiveAgreement();
  }, [userId, customerId, consentType]);
  
  const checkConsent = async () => {
    setIsLoading(true);
    
    try {
      // Check if there's a locally stored consent
      const storedPreferences = localStorage.getItem('cookie-preferences');
      if (storedPreferences) {
        const preferences = JSON.parse(storedPreferences);
        if (preferences[consentType]) {
          setHasConsent(true);
          setIsLoading(false);
          return;
        }
      }
      
      // Check for user consent in the database
      if (userId) {
        const hasUserConsented = await gdprComplianceService.hasUserConsented(userId, consentType);
        setHasConsent(hasUserConsented);
      } else {
        setHasConsent(false);
      }
    } catch (error) {
      console.error('Error checking consent:', error);
      setHasConsent(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchActiveAgreement = async () => {
    try {
      const activeAgreement = await gdprComplianceService.getActiveDataProcessingAgreement();
      setAgreement(activeAgreement);
    } catch (error) {
      console.error('Error fetching agreement:', error);
    }
  };
  
  const handleConsentChange = (value: boolean) => {
    setConsentGiven(value);
  };
  
  const handleSubmit = async () => {
    if (!agreement || (!userId && !customerId)) return;
    
    setIsSubmitting(true);
    
    try {
      await gdprComplianceService.recordConsent({
        agreement_id: agreement.id,
        user_id: userId || '',
        customer_id: customerId,
        consent_type: consentType,
        status: consentGiven ? 'granted' : 'denied',
        consent_date: new Date().toISOString(),
        ip_address: window.location.hostname,
      });
      
      // Update local state and localStorage
      setHasConsent(consentGiven);
      
      // Update localStorage preferences
      const storedPreferences = localStorage.getItem('cookie-preferences');
      const preferences = storedPreferences ? JSON.parse(storedPreferences) : {};
      preferences[consentType] = consentGiven;
      localStorage.setItem('cookie-preferences', JSON.stringify(preferences));
      
    } catch (error) {
      console.error('Error recording consent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking consent
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user has consent, show children
  if (hasConsent) {
    return <>{children}</>;
  }

  // If a fallback is provided and no consent is given, show fallback
  if (fallback && !hasConsent) {
    return <>{fallback}</>;
  }

  // Otherwise, show consent form
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {agreement ? (
          <ConsentCheckbox
            consentType={consentType}
            label={`I consent to ${title.toLowerCase()}`}
            description={description}
            agreementId={agreement.id}
            userId={userId}
            customerId={customerId}
            onConsentChange={handleConsentChange}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Unable to load consent options. Please try again later.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={!consentGiven || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Preference...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ConsentRequired; 