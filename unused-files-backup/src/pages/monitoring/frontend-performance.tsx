import React, { useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Home, Server, Layers, Activity } from 'lucide-react';
import FrontendPerformanceDashboard from '@/components/monitoring/FrontendPerformanceDashboard';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useInitPerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

const FrontendPerformancePage: NextPage = () => {
  const router = useRouter();
  const { hasPermission } = useUserPermissions();
  
  // Initialize performance monitoring for the current page
  // In a real app, you might want to pass the user ID
  useInitPerformanceMonitoring();

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
        <title>Frontend Performance Monitoring | Form Management System</title>
        <meta name="description" content="Monitor frontend performance, page load times, component rendering, and form submission metrics" />
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
              <BreadcrumbLink href="/monitoring/frontend-performance" className="font-medium">
                <Layers className="h-4 w-4 mr-2" />
                <span>Frontend Performance</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Main Content */}
        <FrontendPerformanceDashboard />
      </div>
    </>
  );
};

export default FrontendPerformancePage; 