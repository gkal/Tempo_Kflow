import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Lazy load all components
const Sidebar = lazy(() => import("./layout/Sidebar"));
const TopBar = lazy(() => import("./layout/TopBar"));
const MetricCards = lazy(() => import("./dashboard/MetricCards"));
const SettingsPage = lazy(() => import("./settings/SettingsPage"));
const LoadingSpinner = lazy(() => import('./ui/LoadingSpinner'));
const DialogUtilities = lazy(() => import("@/components/ui/DialogUtilities").then(module => ({ default: module.DialogUtilities })));
const ErrorBoundary = lazy(() => import('./ErrorBoundary'));
const RecoveryPage = lazy(() => import("./admin/RecoveryPage"));
const BackupPage = lazy(() => import("./admin/BackupPage"));
const ServiceTypesPage = lazy(() => import("./admin/ServiceTypesPage"));
const TasksPage = lazy(() => import("./tasks/TasksPage"));

/**
 * CRITICAL: CustomersPage implements real-time subscriptions that update data automatically.
 * This feature took 10+ hours to implement and ensures that when customer data is created, 
 * updated, or deleted, all connected users see changes instantly without page refresh.
 * Only the affected rows are updated in the UI. DO NOT MODIFY this real-time functionality.
 */
const CustomersPage = lazy(() => import("./customers/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./customers/CustomerDetailPage"));

/**
 * CRITICAL: OffersPage implements real-time subscriptions that update data automatically.
 * This feature took 10+ hours to implement and ensures that when offer data is created,
 * updated, or deleted, all connected users see changes instantly without page refresh.
 * Only the affected rows are updated in the UI. DO NOT MODIFY this real-time functionality.
 */
const OffersPage = lazy(() => import("./offers/customer_offers/CustomerOffersPage"));

/**
 * Loading spinner component used across lazy-loaded routes
 */
const LoadingContent = () => (
  <LoadingSpinner 
    fullScreen={false} 
    className="p-8"
  />
);

/**
 * Under construction page display
 */
const UnderConstructionPage = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-6 text-[#cad2c5]">{title}</h1>
    <div className="bg-[#354f52] p-6 rounded-lg shadow-md">
      <p className="text-[#cad2c5]">Η λειτουργία διαχείρισης {title.toLowerCase()} είναι υπό κατασκευή.</p>
    </div>
  </div>
);

/**
 * Main home component that renders the appropriate content based on the current route
 */
const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  // Redirect users to appropriate pages based on role
  useEffect(() => {
    // Check for admin-only pages
    const adminOnlyPaths = ['/admin/recovery', '/admin/backup', '/admin/service-types'];
    
    if (!isAdmin && adminOnlyPaths.includes(location.pathname)) {
      // Redirect non-admin users trying to access admin pages
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, isAdmin, navigate]);

  /**
   * Renders the appropriate content based on the current route path
   */
  const renderContent = () => {
    const path = location.pathname;

    // Settings page
    if (path === "/dashboard/settings") {
      return <SettingsPage />;
    }

    // Admin pages - only accessible to admins
    if (path === "/admin/recovery" && isAdmin) {
      return (
        <ErrorBoundary
          fallback={
            <div className="p-8 text-center text-[#cad2c5]">
              <h2 className="text-xl mb-4">Σφάλμα φόρτωσης σελίδας ανάκτησης</h2>
              <p className="mb-6 text-[#84a98c]">
                Παρουσιάστηκε σφάλμα κατά τη φόρτωση της σελίδας ανάκτησης.
                Η ομάδα ανάπτυξης έχει ενημερωθεί για το πρόβλημα.
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="mt-4 bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Επιστροφή στον πίνακα ελέγχου
              </Button>
            </div>
          }
        >
          <Suspense fallback={<LoadingContent />}>
            <RecoveryPage />
          </Suspense>
        </ErrorBoundary>
      );
    }

    if (path === "/admin/backup" && isAdmin) {
      return (
        <Suspense fallback={<LoadingContent />}>
          <BackupPage />
        </Suspense>
      );
    }

    if (path === "/admin/service-types" && isAdmin) {
      return (
        <Suspense fallback={<LoadingContent />}>
          <ServiceTypesPage />
        </Suspense>
      );
    }

    // Task management
    if (path === "/tasks") {
      return (
        <Suspense fallback={<LoadingContent />}>
          <TasksPage />
        </Suspense>
      );
    }

    // Customer management
    if (path === "/customers") {
      return (
        <Suspense fallback={<LoadingContent />}>
          {/* 
            CRITICAL: This component uses real-time subscriptions for customers data.
            Changes (create/update/delete) automatically propagate to all connected users
            without requiring page refresh. Only affected rows are updated.
            DO NOT modify this functionality - it took 10+ hours to implement correctly.
          */}
          <CustomersPage />
        </Suspense>
      );
    }

    if (path.includes("/customers/")) {
      return (
        <ErrorBoundary
          fallback={
            <div className="p-8 text-center text-[#cad2c5]">
              <h2 className="text-xl mb-4">Σφάλμα φόρτωσης στοιχείων πελάτη</h2>
              <p className="mb-6 text-[#84a98c]">
                Παρουσιάστηκε σφάλμα κατά τη φόρτωση της σελίδας στοιχείων του πελάτη.
                Η ομάδα ανάπτυξης έχει ενημερωθεί για το πρόβλημα.
              </p>
              <Button
                onClick={() => navigate("/customers")}
                className="mt-4 bg-[#52796f] hover:bg-[#52796f]/90 text-[#cad2c5]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Επιστροφή στη λίστα πελατών
              </Button>
            </div>
          }
        >
          <Suspense fallback={<LoadingContent />}>
            <CustomerDetailPage />
          </Suspense>
        </ErrorBoundary>
      );
    }

    // Offers management
    if (path === "/offers") {
      return (
        <Suspense fallback={<LoadingContent />}>
          {/* 
            CRITICAL: This component uses real-time subscriptions for offers data.
            Changes (create/update/delete) automatically propagate to all connected users
            without requiring page refresh. Only affected rows are updated.
            DO NOT modify this functionality - it took 10+ hours to implement correctly.
          */}
          <OffersPage />
        </Suspense>
      );
    }

    // Under construction pages
    if (path === "/calls") {
      return <UnderConstructionPage title="Κλήσεις" />;
    }

    // Default dashboard view
    return (
      <div className="p-8">
        <div className="mb-8">
          <MetricCards />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#2f3e46]">
      <DialogUtilities />
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto" role="main" aria-label="Main content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Home; 