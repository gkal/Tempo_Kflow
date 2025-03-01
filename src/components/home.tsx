import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/TopBar";
import MetricCards from "./dashboard/MetricCards";
import DataTable from "./dashboard/DataTable";
import SettingsPage from "./settings/SettingsPage";

const Home = () => {
  const location = useLocation();

  const renderContent = () => {
    const path = location.pathname;

    if (path === "/dashboard/settings") {
      return <SettingsPage />;
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

    return (
      <div className="p-8">
        <div className="mb-8">
          <MetricCards />
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#cad2c5] mb-4">
            Πρόσφατη Δραστηριότητα
          </h2>
          <DataTable />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#2f3e46]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
};

export default Home;
