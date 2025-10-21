import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

import type { LevelStatus } from "../../api/client";
import { fetchLevelStatus } from "../../api/client";
import { useUserProfile } from "../../lib/useUserProfile";
import { getReadableTextColor } from "../../utils/colorUtils";
import OrgaliferLogo from "../Brand/OrgaliferLogo";
import { DynamicAvatar } from "../Avatar/DynamicAvatar";

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
  const { profile } = useUserProfile();

  const levelStatusQuery = useQuery({
    queryKey: ["xp", "level-status", "topbar"],
    queryFn: fetchLevelStatus,
    refetchInterval: 60_000,
  });

  const chipTextColor = getReadableTextColor(CHIP_BACKGROUND);
  const progress = computeProgress(levelStatusQuery.data);
  const avatarLevel = levelStatusQuery.data?.current_level ?? 1;
  const avatarBusy = levelStatusQuery.isLoading || levelStatusQuery.isFetching;
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
      className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/85 px-5 py-3 backdrop-blur lg:px-6"
      style={{ color: getReadableTextColor(HEADER_BACKGROUND) }}
      aria-label={heading}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 p-2.5 text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <OrgaliferLogo size={84} className="ml-1" />
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-4 text-sm">
        <div
          className="flex items-center gap-2 rounded-full border border-slate-700/80 px-4 py-2 shadow-sm"
          style={{ backgroundColor: CHIP_BACKGROUND, color: chipTextColor }}
        >
          <span className="text-sm font-semibold">XP Progress</span>
          <span>{progress}%</span>
        </div>

        <div className="group flex items-center gap-3 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-2 shadow-sm transition hover:border-emerald-400/60">
          <DynamicAvatar
            level={avatarLevel}
            animated={!avatarBusy}
            variant="badge"
            className="h-12 w-12"
            ariaLabel={`${profile.name} avatar`}
          />
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
