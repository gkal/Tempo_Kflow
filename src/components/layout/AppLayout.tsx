import { NavSidebar } from './NavSidebar';
import { HeaderBar } from './HeaderBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <NavSidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <HeaderBar />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
} 