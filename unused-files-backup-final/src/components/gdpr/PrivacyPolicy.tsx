import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, Info, Loader2 } from 'lucide-react';
import { GDPRConsentGroup } from '@/components/gdpr/ConsentCheckbox';
import { gdprComplianceService } from '@/services/gdprComplianceService';
import { cn } from '@/lib/utils';

interface PrivacyPolicyProps {
  userId?: string;
  customerId?: string;
  showConsent?: boolean;
  onAccept?: () => void;
  className?: string;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  userId,
  customerId,
  showConsent = true,
  onAccept,
  className,
}) => {
  const [agreement, setAgreement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consents, setConsents] = useState<Record<string, boolean>>({
    necessary: true,
    data_processing: false,
    marketing: false,
    analytics: false,
    third_party: false,
  });
  
  useEffect(() => {
    fetchActiveAgreement();
  }, []);
  
  const fetchActiveAgreement = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const agreement = await gdprComplianceService.getActiveDataProcessingAgreement();
      setAgreement(agreement);
    } catch (error) {
      console.error('Error fetching data processing agreement:', error);
      setError('Failed to load the privacy policy. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConsentChange = (value: boolean) => {
    setConsented(value);
  };
  
  const handleConsentsChange = (newConsents: Record<string, boolean>) => {
    setConsents(newConsents);
  };
  
  const handleAccept = async () => {
    if (!consented || !agreement) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Record consent for data processing (required)
      await gdprComplianceService.recordConsent({
        agreement_id: agreement.id,
        user_id: userId || '',
        customer_id: customerId,
        consent_type: 'data_processing',
        status: 'granted',
        consent_date: new Date().toISOString(),
        ip_address: window.location.hostname,
      });
      
      // Record other consents if provided
      for (const [type, value] of Object.entries(consents)) {
        if (type !== 'data_processing' && type !== 'necessary') {
          await gdprComplianceService.recordConsent({
            agreement_id: agreement.id,
            user_id: userId || '',
            customer_id: customerId,
            consent_type: type as any,
            status: value ? 'granted' : 'denied',
            consent_date: new Date().toISOString(),
            ip_address: window.location.hostname,
          });
        }
      }
      
      if (onAccept) {
        onAccept();
      }
    } catch (error) {
      console.error('Error recording consent:', error);
      setError('Failed to record your consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full max-w-4xl mx-auto', className)}>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full max-w-4xl mx-auto', className)}>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={fetchActiveAgreement}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!agreement) {
    return (
      <Card className={cn('w-full max-w-4xl mx-auto', className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Info className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No Privacy Policy Found</h3>
            <p className="max-w-sm mt-2">
              There is currently no active privacy policy available. Please contact the administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', className)}>
      <CardHeader>
        <CardTitle>{agreement.title} (v{agreement.version})</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="privacy" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
            <TabsTrigger value="data">Data Processing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="privacy">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: agreement.content }} />
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="data">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data We Collect</h3>
                <p>We collect the following types of personal data:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Contact information (name, email, phone number)</li>
                  <li>Account information (username, password)</li>
                  <li>Usage data (how you interact with our services)</li>
                  <li>Device information (IP address, browser type)</li>
                  <li>Location data (based on IP address)</li>
                </ul>
                
                <h3 className="text-lg font-medium mt-6">How We Process Your Data</h3>
                <p>We process your data for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To provide and maintain our services</li>
                  <li>To notify you about changes to our services</li>
                  <li>To allow you to participate in interactive features</li>
                  <li>To provide customer support</li>
                  <li>To gather analysis to improve our services</li>
                  <li>To monitor the usage of our services</li>
                  <li>To detect, prevent and address technical issues</li>
                </ul>
                
                <h3 className="text-lg font-medium mt-6">Your Data Rights</h3>
                <p>Under GDPR, you have the following rights:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Right to Access</strong> - You can request copies of your personal data.</li>
                  <li><strong>Right to Rectification</strong> - You can request that we correct inaccurate information.</li>
                  <li><strong>Right to Erasure</strong> - You can request that we delete your personal data.</li>
                  <li><strong>Right to Restrict Processing</strong> - You can request that we restrict the processing of your data.</li>
                  <li><strong>Right to Data Portability</strong> - You can request that we transfer your data to another organization.</li>
                  <li><strong>Right to Object</strong> - You can object to our processing of your personal data.</li>
                </ul>
                
                <h3 className="text-lg font-medium mt-6">Data Retention</h3>
                <p>We retain your personal data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.</p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        {showConsent && (
          <div className="mt-6 space-y-6">
            <div className="rounded-md border p-4 bg-slate-50">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="accept-privacy-policy"
                  checked={consented}
                  onCheckedChange={handleConsentChange}
                  className="mt-1"
                />
                <div>
                  <Label
                    htmlFor="accept-privacy-policy"
                    className="text-sm font-medium after:content-['*'] after:ml-1 after:text-red-500"
                  >
                    I have read and agree to the Privacy Policy and Data Processing terms
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    You must accept the privacy policy to continue. This includes consenting to the processing
                    of your personal data as described above.
                  </p>
                </div>
              </div>
            </div>
            
            {agreement && userId && (
              <div className="border rounded-md p-4">
                <h3 className="text-sm font-medium mb-3">Cookie and Processing Preferences</h3>
                <GDPRConsentGroup
                  agreementId={agreement.id}
                  userId={userId}
                  customerId={customerId}
                  onConsentsChange={handleConsentsChange}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {showConsent && (
        <CardFooter className="flex justify-between pt-6 border-t">
          <div className="text-xs text-muted-foreground">
            Effective date: {new Date(agreement.effective_date).toLocaleDateString()}
          </div>
          <Button 
            onClick={handleAccept} 
            disabled={!consented || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Accept & Continue
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default PrivacyPolicy; 