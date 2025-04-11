import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import PrivacyPolicy from '@/components/gdpr/PrivacyPolicy';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showConsentOptions, setShowConsentOptions] = useState(false);
  
  useEffect(() => {
    // Determine if we should show consent options based on query param
    const { consent } = router.query;
    if (consent === 'true') {
      setShowConsentOptions(true);
    }
  }, [router.query]);
  
  // Handle successful consent acceptance
  const handleAccept = () => {
    const returnUrl = router.query.returnUrl as string;
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.push('/dashboard');
    }
  };
  
  return (
    <Layout>
      <div className="container py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-1">
            Our commitment to your privacy and data protection
          </p>
        </div>
        
        <PrivacyPolicy
          userId={user?.id}
          showConsent={showConsentOptions}
          onAccept={handleAccept}
        />
        
        {!showConsentOptions && (
          <div className="flex justify-end mt-6">
            <Button onClick={() => router.back()}>Return</Button>
          </div>
        )}
      </div>
    </Layout>
  );
} 