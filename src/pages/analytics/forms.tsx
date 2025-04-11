import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import FormAnalyticsDashboard from '@/components/analytics/FormAnalyticsDashboard';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { AlertCircle } from 'lucide-react';

const FormsAnalyticsPage: NextPage = () => {
  const router = useRouter();
  const { hasPermission, isLoading } = useUserPermissions();
  
  // Check if user has permission to view analytics
  const hasAccess = hasPermission('view_analytics');
  
  // Redirect to homepage if no permissions
  React.useEffect(() => {
    if (!isLoading && !hasAccess) {
      router.push('/');
    }
  }, [hasAccess, isLoading, router]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center h-80">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-300 rounded-full mb-4"></div>
            <div className="h-4 w-48 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 w-32 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show access denied if no permission
  if (!hasAccess) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col items-center justify-center h-80">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Δεν έχετε πρόσβαση</h2>
          <p className="text-gray-600 text-center max-w-md">
            Δεν έχετε τα απαραίτητα δικαιώματα για να δείτε τα αναλυτικά στοιχεία των φορμών.
            Παρακαλούμε επικοινωνήστε με τον διαχειριστή του συστήματος.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Αναλυτικά Στοιχεία Φορμών | Tempo K-Flow</title>
        <meta 
          name="description" 
          content="Αναλυτικά στοιχεία και μετρήσεις για τις φόρμες πελατών" 
        />
      </Head>
      
      <div className="container mx-auto py-6 px-4">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Αρχική</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/analytics">Αναλυτικά Στοιχεία</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>Φόρμες</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
        </div>
        
        {/* Analytics Dashboard */}
        <FormAnalyticsDashboard />
      </div>
    </>
  );
};

export default FormsAnalyticsPage; 