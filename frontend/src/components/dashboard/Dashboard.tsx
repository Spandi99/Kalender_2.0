import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { CalendarSection } from "./CalendarSection";
import { AIInsightsCard } from "./AIInsightsCard";
import { HealthCard } from "./HealthCard";
import { XPCard } from "./XPCard";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Calendar },
  { label: "Kalender & Verwaltung", href: "/legacy", icon: Calendar },
];

export default function Dashboard() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kalender 2.0</p>
            <p className="text-lg font-semibold">Unified Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
          <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-purple-500/10 p-6 shadow-md ring-1 ring-inset ring-slate-200/60 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-purple-600/10 dark:ring-slate-800"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                  Phase 11
                </p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Self-Healing Visualization &amp; Insights</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Behalte Kalender, XP-Fortschritt, AI-Empfehlungen und Systemzustand in einer zentralen Ansicht im Blick.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                Aktualisiert automatisch alle 60 Sekunden
              </div>
            </div>
          </motion.header>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
            className="grid grid-cols-1 gap-6 xl:grid-cols-3"
          >
            <div className="xl:col-span-2">
              <CalendarSection />
            </div>

            <div className="flex flex-col gap-4">
              <XPCard />
              <AIInsightsCard />
              <HealthCard />
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
