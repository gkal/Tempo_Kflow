import React from "react";
import Sidebar from "./layout/Sidebar";
import MetricCards from "./dashboard/MetricCards";
import DataTable from "./dashboard/DataTable";

const Home = () => {
  return (
    <div className="flex h-screen bg-[#2f3e46]">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#cad2c5]">K-Flow ERP</h1>
            <p className="text-[#84a98c]">
              Καλώς ήρθατε στο σύστημα διαχείρισης
            </p>
          </div>

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
      </div>
    </div>
  );
};

export default Home;
