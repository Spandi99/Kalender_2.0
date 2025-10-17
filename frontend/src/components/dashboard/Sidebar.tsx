import { Fragment } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  Sparkles,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar", to: "/dashboard/calendar", icon: CalendarDays },
  { label: "XP & Level", to: "/dashboard/xp", icon: Sparkles },
  { label: "AI Insights", to: "/dashboard/ai", icon: Bot },
  { label: "Templates", to: "/dashboard/templates", icon: NotebookPen },
  { label: "Feedback", to: "/dashboard/feedback", icon: MessageSquare },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white/90 px-6 py-6 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-300">Kalender 2.0</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unified Dashboard</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => {
              const active =
                isActive ||
                (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
              return `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-200"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/70 dark:hover:text-gray-100"
              }`;
            }}
            end={item.to === "/dashboard"}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  return (
    <Fragment>
      <div className="hidden h-full w-72 lg:block">
        <SidebarContent />
      </div>

      <AnimatePresence>
        {isMobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gray-900/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="relative h-full w-72"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              <SidebarContent onClose={onClose} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Fragment>
  );
}

export default Sidebar;
