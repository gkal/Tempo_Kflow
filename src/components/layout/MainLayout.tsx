import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <TopBar />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
} 
