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
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar isMobileOpen={sidebarOpen} onClose={handleCloseSidebar} />

      <div className="flex flex-1 flex-col">
        <TopBar onToggleSidebar={handleToggleSidebar} />

        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
