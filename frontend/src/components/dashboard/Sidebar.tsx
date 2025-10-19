import { Fragment, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarDays,
  DownloadCloud,
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  Sparkles,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { useAvatar, type AvatarStatus } from "../../lib/useAvatar";
import { useUserProfile, type UserProfile } from "../../lib/useUserProfile";
import { getReadableTextColor, withAlpha } from "../../utils/colorUtils";
import OrgaliferLogo from "../Brand/OrgaliferLogo";
import UserAvatar from "../Avatar/UserAvatar";
import { Progress } from "../ui/progress";

const navItems = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar", to: "/dashboard/calendar", icon: CalendarDays },
  { label: "XP & Level", to: "/dashboard/xp", icon: Sparkles },
  { label: "Calendar Import", to: "/dashboard/ical", icon: DownloadCloud },
  { label: "AI Insights", to: "/dashboard/ai", icon: Bot },
  { label: "Templates", to: "/dashboard/templates", icon: NotebookPen },
  { label: "Feedback", to: "/dashboard/feedback", icon: MessageSquare },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

interface SidebarContentProps {
  onClose?: () => void;
  avatarStatus?: AvatarStatus;
  isAvatarLoading?: boolean;
  profile: UserProfile;
}

const SIDEBAR_BACKGROUND = "rgba(2, 6, 23, 0.92)";
const ACTIVE_NAV_BACKGROUND = withAlpha("#0066FF", 0.2);
const HOVER_NAV_BACKGROUND = "rgba(15, 23, 42, 0.7)";

function SidebarContent({ onClose, avatarStatus, isAvatarLoading, profile }: SidebarContentProps) {
  const location = useLocation();

  const xpProgress = avatarStatus ? Math.round(Math.min(Math.max(avatarStatus.level_progress, 0), 1) * 100) : 0;
  const xpLabel = avatarStatus
    ? avatarStatus.xp_next != null
      ? `${avatarStatus.xp_current} / ${avatarStatus.xp_next} XP`
      : `${avatarStatus.xp_current} XP`
    : "–";
  const xpRemaining = avatarStatus
    ? avatarStatus.xp_to_next != null
      ? `${avatarStatus.xp_to_next} XP to level ${avatarStatus.current_level + 1}`
      : "Max level reached"
    : isAvatarLoading
    ? "Loading…"
    : "No data yet";
  const avatarLevelLabel = avatarStatus ? `Level ${avatarStatus.current_level}` : isAvatarLoading ? "Loading…" : "Avatar Status";
  const displayedAvatarState = avatarStatus
    ? avatarStatus.avatar_state.replace(/_/g, " ")
    : isAvatarLoading
    ? "Fetching status…"
    : "Inactive";
  const moodLabel = avatarStatus ? `Mood: ${avatarStatus.expression}` : "";
  const xpProgressLabel = avatarStatus ? `${xpProgress}%` : isAvatarLoading ? "…" : "–";

  const sidebarTextColor = useMemo(() => getReadableTextColor(SIDEBAR_BACKGROUND), []);
  const xpCardBackground = "rgba(15, 23, 42, 0.82)";
  const xpCardTextColor = useMemo(() => getReadableTextColor(xpCardBackground), []);
  const inactiveNavColor = "rgba(221, 229, 255, 0.82)";

  return (
    <div
      className="flex h-full flex-col border-r border-slate-800/80 bg-slate-950/90 px-6 py-6 shadow-xl backdrop-blur"
      style={{ color: sidebarTextColor }}
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <OrgaliferLogo size={120} />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
            Smart Calendar
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-800/80 bg-slate-900/60 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 shadow-inner">
        <UserAvatar name={profile.name} imageUrl={profile.avatarUrl} aiPreviewUrl={profile.aiAvatarUrl} size={48} />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-100">{profile.name}</p>
          {profile.email ? <p className="text-xs text-slate-400">{profile.email}</p> : null}
          <p className="text-xs text-slate-500">Personalized insights ready</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => {
              const active = isActive || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
              return [
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0",
                active ? "shadow-inner shadow-blue-900/50" : "hover:bg-slate-800/60",
              ].join(" ");
            }}
            style={({ isActive }) => {
              const active = isActive || (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
              const background = active ? ACTIVE_NAV_BACKGROUND : "transparent";
              const textColor = getReadableTextColor(background || SIDEBAR_BACKGROUND);
              return {
                backgroundColor: background,
                color: active ? textColor : inactiveNavColor,
              };
            }}
            end={item.to === "/dashboard"}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <div
          className="rounded-2xl border border-slate-800/70 p-4 text-sm shadow-inner"
          style={{ backgroundColor: xpCardBackground, color: xpCardTextColor }}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-300/90">
            <span>XP Progress</span>
            <span>{xpProgressLabel}</span>
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-100">{avatarLevelLabel}</div>
          <div className="text-xs text-slate-300/90">{displayedAvatarState}</div>
          {moodLabel ? <div className="text-xs text-slate-400/90">{moodLabel}</div> : null}
          <Progress value={xpProgress} className="mt-3 h-2 bg-slate-800/60" />
          <div className="mt-3 text-xs text-slate-200/90">{xpLabel}</div>
          <div className="text-xs text-slate-400/80">{xpRemaining}</div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
  const avatarQuery = useAvatar();
  const avatarStatus = avatarQuery.data;
  const isAvatarLoading = avatarQuery.isLoading || avatarQuery.isFetching;
  const { profile } = useUserProfile();

  return (
    <Fragment>
      <div className="hidden h-full w-72 lg:block">
        <SidebarContent profile={profile} avatarStatus={avatarStatus} isAvatarLoading={isAvatarLoading} />
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
              className="absolute inset-0 bg-slate-900/70"
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
              <SidebarContent
                onClose={onClose}
                profile={profile}
                avatarStatus={avatarStatus}
                isAvatarLoading={isAvatarLoading}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Fragment>
  );
}

export default Sidebar;
