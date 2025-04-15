import { useEffect, useState } from 'react';
import SecurityScanningDashboard from '@/components/security/SecurityScanningDashboard';
import { Layout } from '@/components/layout/Layout';
import { authService } from '@/services/authService';
import { useRouter } from 'next/router';
import { Loader2 } from 'lucide-react';

export default function SecurityScanningPage() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkPermissions() {
      try {
        const hasSecurityAccess = await authService.checkUserPermission('security.access');
        
        if (!hasSecurityAccess) {
          router.push('/dashboard');
          return;
        }
        
        setHasPermission(true);
      } catch (error) {
        console.error('Permission check error:', error);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    }
    
    checkPermissions();
  }, [router]);
  
  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">Loading security dashboard...</p>
        </div>
      </Layout>
    );
  }
  
  if (!hasPermission) {
    return null; // Will redirect in useEffect
  }

  return (
    <Layout>
      <SecurityScanningDashboard />
    </Layout>
  );
} 