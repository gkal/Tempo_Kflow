import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import DatabasePerformanceDashboard from '@/components/monitoring/DatabasePerformanceDashboard';
import AdminLayout from '@/components/layout/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Props interface for the page
interface DatabasePerformancePageProps {
  isAuthorized: boolean;
  error?: string;
}

/**
 * Database Performance Monitoring Page
 * Shows the database performance dashboard for authorized admin users
 */
const DatabasePerformancePage: React.FC<DatabasePerformancePageProps> = ({ isAuthorized, error }) => {
  // If user is not authorized, show an error
  if (!isAuthorized) {
    return (
      <AdminLayout>
        <Head>
          <title>Access Denied | Database Performance Monitoring</title>
        </Head>
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access the database performance monitoring dashboard.
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
          <title>Error | Database Performance Monitoring</title>
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
        <title>Database Performance Monitoring</title>
      </Head>
      <div className="container mx-auto py-6">
        <DatabasePerformanceDashboard />
      </div>
    </AdminLayout>
  );
};

/**
 * Server-side props to check user authorization
 */
export const getServerSideProps: GetServerSideProps<DatabasePerformancePageProps> = async (context) => {
  try {
    // Get the user session
    const session = await getServerSession(context.req, context.res, authOptions);
    
    // Check if user is logged in
    if (!session) {
      return {
        redirect: {
          destination: '/login?callbackUrl=/admin/monitoring/database-performance',
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

export default DatabasePerformancePage; 