import React from 'react';
import Head from 'next/head';
import { Layout } from '@/components/layout/Layout';
import AuditTrailDashboard from '@/components/audit/AuditTrailDashboard';
import { checkUserPermission } from '@/services/sessionService';
import { GetServerSidePropsContext } from 'next';
import { getSession } from '@/lib/supabaseServer';

/**
 * Audit Trail Page - Main entry point for the audit trail dashboard
 */
const AuditTrailPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Σύστημα Καταγραφής Ενεργειών | Tempo Kflow</title>
        <meta name="description" content="Πλήρες σύστημα καταγραφής και παρακολούθησης ενεργειών στην εφαρμογή" />
      </Head>
      
      <Layout>
        <div className="container mx-auto">
          <AuditTrailDashboard />
        </div>
      </Layout>
    </>
  );
};

// Server-side permission check
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  
  // If no session, redirect to login
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
  
  try {
    // Check if user has permission to view audit trails
    const hasPermission = await checkUserPermission(session.user.id, 'view_audit_trails');
    
    // If no permission, redirect to access denied page
    if (!hasPermission) {
      return {
        redirect: {
          destination: '/access-denied',
          permanent: false,
        },
      };
    }
    
    // User has permission, proceed to the page
    return {
      props: {},
    };
  } catch (error) {
    console.error('Error checking permissions:', error);
    
    // On error, redirect to error page
    return {
      redirect: {
        destination: '/error',
        permanent: false,
      },
    };
  }
}

export default AuditTrailPage; 