import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gdprComplianceService, ConsentRecord } from '@/services/gdprComplianceService';

interface ConsentCheckboxProps {
  consentType: ConsentRecord['consent_type'];
  label: string;
  description?: string;
  required?: boolean;
  defaultChecked?: boolean;
  className?: string;
  agreementId?: string;
  userId?: string;
  customerId?: string;
  onConsentChange?: (consentGiven: boolean) => void;
  disabled?: boolean;
}

/**
 * A GDPR-compliant consent checkbox component that records user consent
 * when checked/unchecked and provides explanatory information about the consent.
 */
export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  consentType,
  label,
  description,
  required = false,
  defaultChecked = false,
  className,
  agreementId,
  userId,
  customerId,
  onConsentChange,
  disabled = false,
}) => {
  const [checked, setChecked] = useState<boolean>(defaultChecked);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const handleConsentChange = async (checked: boolean) => {
    setChecked(checked);
    
    // Call the callback if provided
    if (onConsentChange) {
      onConsentChange(checked);
    }
    
    // Record the consent if we have the necessary information
    if (agreementId && (userId || customerId)) {
      try {
        setIsRecording(true);
        
        await gdprComplianceService.recordConsent({
          agreement_id: agreementId,
          user_id: userId || '',
          customer_id: customerId,
          consent_type: consentType,
          status: checked ? 'granted' : 'denied',
          ip_address: window.location.hostname,
          consent_date: new Date().toISOString(),
        });
        
      } catch (error) {
        console.error('Error recording consent:', error);
        // We don't change the UI state on error as the user has still made their choice
      } finally {
        setIsRecording(false);
      }
    }
  };

  return (
    <div className={cn('flex items-start space-x-2 mb-4', className)}>
      <Checkbox
        id={`consent-${consentType}`}
        checked={checked}
        onCheckedChange={handleConsentChange}
        disabled={disabled || isRecording}
        required={required}
        aria-required={required}
        className="mt-1"
      />
      <div className="grid gap-1">
        <div className="flex items-center">
          <Label
            htmlFor={`consent-${consentType}`}
            className={cn(
              'text-sm font-medium leading-none cursor-pointer',
              required && 'after:content-["*"] after:ml-1 after:text-red-500'
            )}
          >
            {label}
          </Label>
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {consentType === 'necessary' && (
            <div className="ml-2 flex items-center">
              <AlertCircle className="h-4 w-4 text-amber-500 mr-1" />
              <span className="text-xs text-muted-foreground">Required for operation</span>
            </div>
          )}
        </div>
        {consentType === 'necessary' && (
          <p className="text-xs text-muted-foreground">
            This is required for the system to function properly and cannot be disabled.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * A pre-configured set of GDPR consent checkboxes for common uses
 */
export const GDPRConsentGroup: React.FC<{
  agreementId: string;
  userId?: string;
  customerId?: string;
  className?: string;
  onConsentsChange?: (consents: Record<ConsentRecord['consent_type'], boolean>) => void;
}> = ({ agreementId, userId, customerId, className, onConsentsChange }) => {
  const [consents, setConsents] = useState<Record<ConsentRecord['consent_type'], boolean>>({
    necessary: true, // Always true
    marketing: false,
    analytics: false,
    third_party: false,
    data_processing: false,
  });

  const handleConsentChange = (type: ConsentRecord['consent_type'], value: boolean) => {
    const newConsents = {
      ...consents,
      [type]: value,
    };
    
    setConsents(newConsents);
    
    if (onConsentsChange) {
      onConsentsChange(newConsents);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <ConsentCheckbox
        consentType="necessary"
        label="Functional Cookies"
        description="These cookies are essential for the proper functioning of the website and cannot be disabled."
        required={true}
        defaultChecked={true}
        disabled={true}
        agreementId={agreementId}
        userId={userId}
        customerId={customerId}
        onConsentChange={(value) => handleConsentChange('necessary', value)}
      />
      
      <ConsentCheckbox
        consentType="analytics"
        label="Analytics Cookies"
        description="These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously."
        agreementId={agreementId}
        userId={userId}
        customerId={customerId}
        onConsentChange={(value) => handleConsentChange('analytics', value)}
      />
      
      <ConsentCheckbox
        consentType="marketing"
        label="Marketing Cookies"
        description="These cookies are used to track visitors across websites to display relevant advertisements."
        agreementId={agreementId}
        userId={userId}
        customerId={customerId}
        onConsentChange={(value) => handleConsentChange('marketing', value)}
      />
      
      <ConsentCheckbox
        consentType="third_party"
        label="Third-Party Cookies"
        description="These cookies are set by third-party services that appear on our pages. They may track your visits to other websites."
        agreementId={agreementId}
        userId={userId}
        customerId={customerId}
        onConsentChange={(value) => handleConsentChange('third_party', value)}
      />
      
      <ConsentCheckbox
        consentType="data_processing"
        label="Data Processing Consent"
        description="I consent to the processing of my personal data as described in the privacy policy."
        required={true}
        agreementId={agreementId}
        userId={userId}
        customerId={customerId}
        onConsentChange={(value) => handleConsentChange('data_processing', value)}
      />
    </div>
  );
};

export default ConsentCheckbox; 