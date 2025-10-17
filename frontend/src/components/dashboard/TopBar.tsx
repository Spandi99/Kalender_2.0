import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import type { LevelStatus, SystemHealthStatus } from "../../api/client";
import { fetchLevelStatus, fetchSystemHealth } from "../../api/client";
import { Button } from "../ui/button";

interface TopBarProps {
  onToggleSidebar: () => void;
}

const NAV_LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/calendar": "Calendar",
  "/dashboard/xp": "XP & Level",
  "/dashboard/ai": "AI Insights",
  "/dashboard/templates": "Templates",
  "/dashboard/feedback": "Feedback",
};

const STATUS_META = {
  ok: {
    label: "Stable",
    tone: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  recovering: {
    label: "Recovering",
    tone: "text-amber-600",
    dot: "bg-amber-500",
  },
  error: {
    label: "Attention",
    tone: "text-red-600",
    dot: "bg-red-500",
  },
} satisfies Record<string, { label: string; tone: string; dot: string }>;

function resolveStatus(health?: SystemHealthStatus) {
  if (!health) {
    return STATUS_META.ok;
  }
  if (health.status === "error" || health.error) {
    return STATUS_META.error;
  }
  if (!health.self_healing_active) {
    return STATUS_META.recovering;
  }
  return STATUS_META.ok;
}

function computeProgress(level?: LevelStatus) {
  if (!level) {
    return 0;
  }
  if (typeof level.progress === "number") {
    return Math.min(100, Math.max(0, Math.round(level.progress)));
  }
  const total = (level.xp_next ?? level.xp_current) - level.xp_previous;
  const gained = level.xp_current - level.xp_previous;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((gained / total) * 100)));
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const healthQuery = useQuery({
    queryKey: ["system", "health", "topbar"],
    queryFn: fetchSystemHealth,
    refetchInterval: 60_000,
  });

  const levelStatusQuery = useQuery({
    queryKey: ["xp", "level-status", "topbar"],
    queryFn: fetchLevelStatus,
    refetchInterval: 60_000,
  });

  const statusMeta = resolveStatus(healthQuery.data);
  const progress = computeProgress(levelStatusQuery.data);

  const heading = useMemo(() => {
    const pathname = location.pathname.replace(/\/$/, "");
    if (NAV_LABELS[pathname]) {
      return NAV_LABELS[pathname];
    }
    const fallbackEntry = Object.entries(NAV_LABELS).find(([route]) =>
      route !== "/dashboard" && pathname.startsWith(route)
    );
    return fallbackEntry?.[1] ?? "Dashboard";
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex rounded-full border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-300">Phase 11b</p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{heading}</h1>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-4 text-sm">
        <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <span className={`inline-flex items-center gap-2 text-sm font-semibold ${statusMeta.tone}`}>
            <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} aria-hidden />
            {statusMeta.label}
          </span>
          <span className="text-gray-600 dark:text-gray-300">
            {healthQuery.isLoading ? "Checking…" : healthQuery.data?.last_recovery_action ?? "Up to date"}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">XP Progress</span>
          <span className="text-gray-700 dark:text-gray-300">{progress}%</span>
        </div>

        <Button variant="default" onClick={() => navigate("/dashboard/templates")}>Templates</Button>
      </div>
    </header>
  );
}

export default TopBar;
