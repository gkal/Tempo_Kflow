import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";
import MetricCards from "./dashboard/MetricCards";
import DataTable from "./dashboard/DataTable";
import SettingsPage from "./settings/SettingsPage";
import { DialogWarningSupressor } from "@/components/ui/dialog-wrapper";
import { DialogFix } from "@/components/ui/dialog-fix";

const Home = () => {
  const location = useLocation();

  const renderContent = () => {
    const path = location.pathname;

    if (path === "/dashboard/settings") {
      return <SettingsPage />;
    }

    if (path === "/admin/recovery") {
      const RecoveryPage = React.lazy(
        () => import("./admin/RecoveryPage"),
      );
      return (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          }
        >
          <RecoveryPage />
        </React.Suspense>
      );
    }

    if (path === "/admin/backup") {
      const BackupPage = React.lazy(
        () => import("./admin/BackupPage"),
      );
      return (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          }
        >
          <BackupPage />
        </React.Suspense>
      );
    }

    if (path === "/admin/service-types") {
      const ServiceTypesPage = React.lazy(
        () => import("./admin/ServiceTypesPage"),
      );
      return (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          }
        >
          <ServiceTypesPage />
        </React.Suspense>
      );
    }

    if (path === "/tasks") {
      const TasksPage = React.lazy(
        () => import("./tasks/TasksPage"),
      );
      return (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          }
        >
          <TasksPage />
        </React.Suspense>
      );
    }

    if (path === "/customers") {
      const CustomersPage = React.lazy(
        () => import("./customers/CustomersPage"),
      );
      return (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          }
        >
          <CustomersPage />
        </React.Suspense>
      );
    }

    if (path.includes("/customers/")) {
      const CustomerDetailPage = React.lazy(
        () => import("./customers/CustomerDetailPage"),
      );
      return (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          }
        >
          <CustomerDetailPage />
        </React.Suspense>
      );
    }

    if (path === "/offers") {
      const OffersPage = React.lazy(
        () => import("./offers/improved/CustomerOffersPage"),
      );
      return (
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 bg-[#cad2c5] rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          }
        >
          <OffersPage />
        </React.Suspense>
      );
    }

    if (path === "/calls") {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-6 text-[#cad2c5]">Κλήσεις</h1>
          <div className="bg-[#354f52] p-6 rounded-lg shadow-md">
            <p className="text-[#cad2c5]">Η λειτουργία διαχείρισης κλήσεων είναι υπό κατασκευή.</p>
          </div>
        </div>
      );
    }

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
      <DialogWarningSupressor />
      <DialogFix />
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
};

export default Home;
