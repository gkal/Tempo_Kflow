import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { ConsentRequired } from './ConsentRequired';
import { GDPRConsentGroup } from './ConsentCheckbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, ShieldIcon, UserIcon } from 'lucide-react';

/**
 * A demo component showcasing all GDPR-related components
 */
export const GDPRDemoSection: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  return (
    <Card className="w-full max-w-5xl mx-auto my-8">
      <CardHeader>
        <CardTitle>GDPR Components Demo</CardTitle>
        <CardDescription>
          Explore the GDPR compliance components available in the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="components" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="usage">Usage Examples</TabsTrigger>
            <TabsTrigger value="links">Navigation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="components">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Cookie Banner</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A banner that appears at the bottom of the screen to get user consent for cookies.
                  The banner automatically appears once for new users.
                </p>
                <div className="p-4 border rounded-md bg-slate-50">
                  <code className="text-xs">{'<CookieBanner userId={user?.id} />'}</code>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Consent Checkbox</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Reusable consent checkboxes for collecting specific consent for various purposes.
                </p>
                <div className="border rounded-md p-4">
                  <GDPRConsentGroup
                    agreementId="demo-agreement-id"
                    userId={user?.id}
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Consent Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A wrapper component that only shows its children if the user has provided specific consent.
                </p>
                <div className="p-4 border rounded-md bg-slate-50">
                  <code className="text-xs">{`<ConsentRequired 
  userId={user?.id}
  consentType="marketing"
  title="Marketing Communications"
  description="Allow us to send you marketing emails"
>
  {/* Protected content */}
</ConsentRequired>`}</code>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Data Subject Request Form</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A form for users to submit GDPR data subject requests (access, deletion, etc.).
                </p>
                <Button 
                  onClick={() => router.push('/gdpr/data-request')}
                  variant="outline"
                >
                  View Data Request Form
                </Button>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Privacy Policy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A component to display the privacy policy with consent options.
                </p>
                <Button 
                  onClick={() => router.push('/gdpr/privacy-policy')}
                  variant="outline"
                >
                  View Privacy Policy
                </Button>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">GDPR Admin Dashboard</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  An admin dashboard for managing data processing agreements, data subject requests, and data breaches.
                </p>
                <Button 
                  onClick={() => router.push('/gdpr/admin')}
                  variant="outline"
                >
                  View Admin Dashboard
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="usage">
            <div className="space-y-6">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Usage Examples</AlertTitle>
                <AlertDescription>
                  Below are examples of how to use the GDPR components in your application.
                </AlertDescription>
              </Alert>
              
              <div className="border rounded-md p-4">
                <h3 className="text-sm font-medium mb-2">Marketing Content Example</h3>
                <ConsentRequired
                  userId={user?.id}
                  consentType="marketing"
                  title="Marketing Communications"
                  description="Allow us to send you promotional emails and show personalized offers"
                  fallback={
                    <div className="py-4">
                      <Alert className="bg-slate-50 border-slate-200">
                        <ShieldIcon className="h-4 w-4" />
                        <AlertTitle>Consent Required</AlertTitle>
                        <AlertDescription>
                          You need to provide consent to see marketing content.
                        </AlertDescription>
                      </Alert>
                    </div>
                  }
                >
                  <div className="py-4 px-6 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="font-medium text-green-800">Special Offer</h4>
                    <p className="text-green-700 text-sm mt-1">
                      Thank you for providing marketing consent! Here's a special offer just for you.
                    </p>
                  </div>
                </ConsentRequired>
              </div>
              
              <div className="border rounded-md p-4">
                <h3 className="text-sm font-medium mb-2">Analytics Integration Example</h3>
                <ConsentRequired
                  userId={user?.id}
                  consentType="analytics"
                  title="Analytics Tracking"
                  description="Allow us to collect anonymous usage data to improve our services"
                >
                  <div className="py-4 px-6 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="font-medium text-blue-800">Analytics Enabled</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      Analytics tracking is now enabled. Thank you for helping us improve our services!
                    </p>
                    <div className="mt-2 p-2 bg-white rounded border border-blue-100">
                      <code className="text-xs text-slate-800">
                        {`// Consent-gated analytics code
import { Analytics } from 'some-analytics-package';

// This would only run if user provided analytics consent
Analytics.initialize({
  userId: '${user?.id || 'user_id'}',
  enableTracking: true
});`}
                      </code>
                    </div>
                  </div>
                </ConsentRequired>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="links">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User-Facing Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-primary"
                        onClick={() => router.push('/gdpr/privacy-policy')}
                      >
                        Privacy Policy
                      </Button>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        View the privacy policy and data processing details
                      </p>
                    </li>
                    <li>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-primary"
                        onClick={() => router.push('/gdpr/data-request')}
                      >
                        Submit Data Request
                      </Button>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submit a GDPR data subject request (access, deletion, etc.)
                      </p>
                    </li>
                    <li>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-primary"
                        onClick={() => {
                          localStorage.removeItem('cookie-consent');
                          localStorage.removeItem('cookie-preferences');
                          window.location.reload();
                        }}
                      >
                        Reset Cookie Consent
                      </Button>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Clear stored cookie preferences and show the banner again
                      </p>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Admin Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-primary"
                        onClick={() => router.push('/gdpr/admin')}
                      >
                        GDPR Admin Dashboard
                      </Button>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage data processing agreements, data subject requests, and more
                      </p>
                    </li>
                    <li>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-primary"
                        onClick={() => router.push('/gdpr/admin?tab=requests')}
                      >
                        Data Subject Requests
                      </Button>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        View and process GDPR data subject requests
                      </p>
                    </li>
                    <li>
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-primary"
                        onClick={() => router.push('/gdpr/admin?tab=agreements')}
                      >
                        Data Processing Agreements
                      </Button>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage privacy policies and data processing agreements
                      </p>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GDPRDemoSection; 