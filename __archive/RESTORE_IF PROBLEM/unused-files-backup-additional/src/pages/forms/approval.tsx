import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { FormApprovalQueue } from '@/components/forms/FormApprovalQueue';
import { FormApprovalDetail } from '@/components/forms/FormApprovalDetail';
import { CustomerFormLink } from '@/services/formLinkService/types';
import { useCustomToast } from '@/hooks/useCustomToast';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layouts/PageLayout';
import { ChevronLeft } from 'lucide-react';

const FormApprovalPage: NextPage = () => {
  const [selectedFormLink, setSelectedFormLink] = useState<CustomerFormLink | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { showToast } = useCustomToast();

  // Handler for when a form is selected from the queue
  const handleFormSelect = (formLink: CustomerFormLink) => {
    setSelectedFormLink(formLink);
  };

  // Handler for when the user wants to go back to the queue
  const handleBackToQueue = () => {
    setSelectedFormLink(null);
  };

  // Handler for successful approval or rejection
  const handleActionSuccess = () => {
    setSelectedFormLink(null);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <PageLayout>
      <Head>
        <title>Έγκριση Φορμών | Kflow</title>
        <meta name="description" content="Διαχείριση και έγκριση υποβληθέντων φορμών πελατών" />
      </Head>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">
              {selectedFormLink ? 'Λεπτομέρειες Φόρμας' : 'Ουρά Εγκρίσεων Φορμών'}
            </h1>
            {selectedFormLink && (
              <Button 
                variant="outline" 
                onClick={handleBackToQueue}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Επιστροφή στη λίστα
              </Button>
            )}
          </div>

          {selectedFormLink ? (
            <FormApprovalDetail 
              formLink={selectedFormLink}
              onClose={handleBackToQueue}
              onApproved={handleActionSuccess}
            />
          ) : (
            <FormApprovalQueue 
              onViewDetails={handleFormSelect}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default FormApprovalPage; 