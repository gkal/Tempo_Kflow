import React from 'react';
import { Layout } from '@/components/layout/Layout';
import DataSubjectRequestForm from '@/components/gdpr/DataSubjectRequestForm';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function DataRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Handle successful request submission
  const handleRequestSubmitted = (requestId: string) => {
    // In a real app, we might want to redirect to a confirmation page
    // or show additional information
    console.log('Request submitted successfully:', requestId);
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
          <h1 className="text-3xl font-bold tracking-tight">Data Subject Request</h1>
          <p className="text-muted-foreground mt-1">
            Submit a request regarding your personal data under GDPR
          </p>
        </div>
        
        <DataSubjectRequestForm
          userId={user?.id}
          onRequestSubmitted={handleRequestSubmitted}
        />
        
        <div className="mt-8 p-4 bg-slate-50 rounded-md border max-w-2xl mx-auto">
          <h3 className="text-sm font-medium mb-2">About Data Subject Requests</h3>
          <p className="text-sm text-muted-foreground">
            Under the General Data Protection Regulation (GDPR), you have the right to access, 
            delete, correct, or export your personal data. This form allows you to submit 
            such requests, which we will process within 30 days as required by law.
          </p>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium mb-1">Verification Required</h4>
              <p className="text-xs text-muted-foreground">
                For security reasons, we'll send a verification email to confirm your identity 
                before processing your request.
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-medium mb-1">Response Time</h4>
              <p className="text-xs text-muted-foreground">
                We'll respond to your request within 30 days. In complex cases, we may extend 
                this period by up to two additional months, but we'll notify you if this is necessary.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 