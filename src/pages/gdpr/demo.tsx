import { Layout } from '@/components/layout/Layout';
import GDPRDemoSection from '@/components/gdpr/GDPRDemoSection';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';

export default function GDPRDemoPage() {
  const router = useRouter();
  
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
          <h1 className="text-3xl font-bold tracking-tight">GDPR Components</h1>
          <p className="text-muted-foreground mt-1">
            Explore the GDPR compliance components available in the application
          </p>
        </div>
        
        <GDPRDemoSection />
      </div>
    </Layout>
  );
} 