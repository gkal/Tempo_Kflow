import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Home, Server, Activity } from 'lucide-react';
import ApiPerformanceDashboard from '@/components/monitoring/ApiPerformanceDashboard';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const ApiPerformancePage: NextPage = () => {
  const router = useRouter();
  const { hasPermission } = useUserPermissions();

  // Check if user has permission to view monitoring dashboard
  const hasMonitoringAccess = hasPermission('view_monitoring');

  // If no permission, redirect to homepage
  if (!hasMonitoringAccess) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return null;
  }

  return (
    <>
      <Head>
        <title>API Performance Monitoring | Form Management System</title>
        <meta name="description" content="Monitor API performance, response times, error rates, and throughput for form APIs" />
      </Head>

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4 mr-2" />
                <span>Home</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/monitoring">
                <Server className="h-4 w-4 mr-2" />
                <span>Monitoring</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/monitoring/api-performance" className="font-medium">
                <Activity className="h-4 w-4 mr-2" />
                <span>API Performance</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Main Content */}
        <ApiPerformanceDashboard />
      </div>
    </>
  );
};

export default ApiPerformancePage; 