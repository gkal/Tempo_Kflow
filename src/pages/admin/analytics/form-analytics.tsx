import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import FormAnalyticsDashboard from '@/components/analytics/FormAnalyticsDashboard';
import AdminLayout from '@/components/layout/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Props interface for the page
interface FormAnalyticsPageProps {
  isAuthorized: boolean;
  error?: string;
}

/**
 * Form Analytics Page
 * Shows the form analytics dashboard for authorized admin users
 */
const FormAnalyticsPage: React.FC<FormAnalyticsPageProps> = ({ isAuthorized, error }) => {
  // If user is not authorized, show an error
  if (!isAuthorized) {
    return (
      <AdminLayout>
        <Head>
          <title>Access Denied | Form Analytics</title>
        </Head>
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access the form analytics dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  // If there's an error, show it
  if (error) {
    return (
      <AdminLayout>
        <Head>
          <title>Error | Form Analytics</title>
        </Head>
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  // Show the dashboard for authorized users
  return (
    <AdminLayout>
      <Head>
        <title>Form Analytics Dashboard</title>
      </Head>
      <div className="container mx-auto py-6">
        <FormAnalyticsDashboard />
      </div>
    </AdminLayout>
  );
};

/**
 * Server-side props to check user authorization
 */
export const getServerSideProps: GetServerSideProps<FormAnalyticsPageProps> = async (context) => {
  try {
    // Get the user session
    const session = await getServerSession(context.req, context.res, authOptions);
    
    // Check if user is logged in
    if (!session) {
      return {
        redirect: {
          destination: '/login?callbackUrl=/admin/analytics/form-analytics',
          permanent: false,
        },
      };
    }
    
    // Check if user has admin role
    // This assumes your session user object has a role property
    const isAdmin = session.user && (session.user as any).role === 'admin';
    
    if (!isAdmin) {
      return {
        props: {
          isAuthorized: false,
        },
      };
    }
    
    // User is authorized
    return {
      props: {
        isAuthorized: true,
      },
    };
  } catch (error) {
    // Handle any errors
    return {
      props: {
        isAuthorized: false,
        error: 'Failed to verify authorization. Please try again later.',
      },
    };
  }
};

export default FormAnalyticsPage; 