import React, { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import CookieBanner from '@/components/gdpr/CookieBanner';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  sidebarOpen = true, 
  onSidebarToggle 
}) => {
  const { user } = useAuth();
  
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onToggle={onSidebarToggle} />
      
      <div className="flex flex-col flex-1">
        <Navbar onMenuClick={onSidebarToggle} />
        
        <main className="flex-1">
          {children}
        </main>
        
        <Footer />
      </div>
      
      {/* GDPR Cookie Banner */}
      <CookieBanner userId={user?.id} />
    </div>
  );
}; 