import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen((previous) => !previous);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Sidebar isMobileOpen={sidebarOpen} onClose={handleCloseSidebar} />

      <div className="flex flex-1 flex-col">
        <TopBar onToggleSidebar={handleToggleSidebar} />

        <main className="flex-1 overflow-y-auto bg-gray-50/60 dark:bg-gray-950/60">
          <div className="mx-auto w-full max-w-7xl p-6 pb-16 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
