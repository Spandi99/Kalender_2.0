import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import type { LevelStatus, SystemHealthStatus } from "../../api/client";
import { fetchLevelStatus, fetchSystemHealth } from "../../api/client";
import { useUserProfile } from "../../lib/useUserProfile";
import { getReadableTextColor, withAlpha } from "../../utils/colorUtils";
import OrgaliferLogo from "../Brand/OrgaliferLogo";
import UserAvatar from "../Avatar/UserAvatar";
import { Button } from "../ui/button";

interface TopBarProps {
  onToggleSidebar: () => void;
}

const NAV_LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/calendar": "Calendar",
  "/dashboard/xp": "XP & Level",
  "/dashboard/ical": "Calendar Import",
  "/dashboard/ai": "AI Insights",
  "/dashboard/templates": "Templates",
  "/dashboard/feedback": "Feedback",
};

const STATUS_META = {
  ok: {
    label: "Systems Stable",
    dot: "#00C896",
    background: withAlpha("#00C896", 0.18),
  },
  recovering: {
    label: "Recovering",
    dot: "#F59E0B",
    background: withAlpha("#F59E0B", 0.18),
  },
  error: {
    label: "Attention",
    dot: "#F97316",
    background: withAlpha("#F97316", 0.24),
  },
} satisfies Record<string, { label: string; dot: string; background: string }>;

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

const HEADER_BACKGROUND = "rgba(2, 6, 23, 0.85)";
const CHIP_BACKGROUND = "rgba(15, 23, 42, 0.78)";

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUserProfile();

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
  const statusTextColor = getReadableTextColor(statusMeta.background);
  const chipTextColor = getReadableTextColor(CHIP_BACKGROUND);
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
    <header
      className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 bg-slate-950/85 px-4 py-2 backdrop-blur lg:px-5"
      style={{ color: getReadableTextColor(HEADER_BACKGROUND) }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 p-2 text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <OrgaliferLogo size={105} />
          <h1 className="text-2xl font-semibold text-slate-100">{heading}</h1>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-4 text-sm">
        <div
          className="flex items-center gap-2 rounded-full border border-slate-700/80 px-4 py-2 shadow-sm"
          style={{ backgroundColor: statusMeta.background, color: statusTextColor }}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusMeta.dot }} aria-hidden />
            {statusMeta.label}
          </span>
          <span>
            {healthQuery.isLoading ? "Checking…" : healthQuery.data?.last_recovery_action ?? "Up to date"}
          </span>
        </div>

        <div
          className="flex items-center gap-2 rounded-full border border-slate-700/80 px-4 py-2 shadow-sm"
          style={{ backgroundColor: CHIP_BACKGROUND, color: chipTextColor }}
        >
          <span className="text-sm font-semibold">XP Progress</span>
          <span>{progress}%</span>
        </div>

        <Button variant="secondary" backgroundColor={CHIP_BACKGROUND} onClick={() => navigate("/dashboard/templates")}
        >
          Templates
        </Button>

        <div className="flex items-center gap-3 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-2 shadow-sm">
          <UserAvatar name={profile.name} imageUrl={profile.avatarUrl} aiPreviewUrl={profile.aiAvatarUrl} size={36} showBadge={false} />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-100">{profile.name}</p>
            <p className="text-xs text-slate-400">Ready for focus mode</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
