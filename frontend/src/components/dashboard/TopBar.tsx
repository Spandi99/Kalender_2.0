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
  "/dashboard/ical": "Kalender-Import",
  "/dashboard/ai": "AI Insights",
  "/dashboard/templates": "Templates",
  "/dashboard/feedback": "Feedback",
};

const STATUS_META = {
  ok: {
    label: "Stable",
    tone: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  recovering: {
    label: "Recovering",
    tone: "text-amber-300",
    dot: "bg-amber-400",
  },
  error: {
    label: "Attention",
    tone: "text-rose-300",
    dot: "bg-rose-400",
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
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/80 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Phase 11c</p>
          <h1 className="text-2xl font-semibold text-white">{heading}</h1>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-4 text-sm">
        <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 shadow-sm">
          <span className={`inline-flex items-center gap-2 text-sm font-semibold ${statusMeta.tone}`}>
            <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} aria-hidden />
            {statusMeta.label}
          </span>
          <span className="text-slate-300">
            {healthQuery.isLoading ? "Checking…" : healthQuery.data?.last_recovery_action ?? "Up to date"}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-blue-300">XP Progress</span>
          <span className="text-slate-200">{progress}%</span>
        </div>

        <Button variant="default" onClick={() => navigate("/dashboard/templates")}>Templates</Button>
      </div>
    </header>
  );
}

export default TopBar;
