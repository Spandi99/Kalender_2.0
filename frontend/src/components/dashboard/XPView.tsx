import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Award, RefreshCcw } from "lucide-react";

import type { XpSummary } from "../../api/client";
import { fetchXpSummary } from "../../api/client";
import { useAvatar, type AvatarStatus } from "../../lib/useAvatar";
import { useUserProfile } from "../../lib/useUserProfile";
import UserAvatar from "../Avatar/UserAvatar";
import { XpDashboard } from "../XP/XpDashboard";
import { Button } from "../ui/button";

function computeDailyAverage(summary?: XpSummary, level?: AvatarStatus) {
  if (!summary) return 0;
  const days = level?.current_level ? Math.max(1, level.current_level) : 1;
  return Math.round(summary.total / days);
}

export default function XPView() {
  const xpSummaryQuery = useQuery({
    queryKey: ["xp", "summary", "dashboard"],
    queryFn: fetchXpSummary,
    refetchInterval: 60_000,
  });

  const avatarQuery = useAvatar();
  const { profile } = useUserProfile();

  const averagePerDay = useMemo(
    () => computeDailyAverage(xpSummaryQuery.data, avatarQuery.data),
    [xpSummaryQuery.data, avatarQuery.data]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-5 rounded-3xl border border-slate-700/80 bg-slate-950/85 px-6 py-6 shadow-2xl"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-accent">XP &amp; Level</p>
            <h2 className="text-3xl font-bold text-slate-100">Gamified Progress</h2>
            <p className="text-sm text-slate-300">
              Analysiere deinen Fortschritt nach Kategorie, Level und Stimmung deines Avatars.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 shadow-inner">
              <UserAvatar
                name={profile.name}
                imageUrl={profile.avatarUrl}
                aiPreviewUrl={profile.aiAvatarUrl}
                size={44}
              />
              <div className="text-sm leading-tight">
                <p className="font-semibold text-slate-100">{profile.name}</p>
                <p className="text-xs text-slate-400">
                  Level {avatarQuery.data?.current_level ?? "–"} • Stimmung {avatarQuery.data?.expression ?? "–"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-brand-primary/40 bg-brand-primary/15 px-3 py-2 text-sm font-semibold text-brand-primary shadow-sm">
              <Award className="h-4 w-4" />
              {averagePerDay} XP pro Level
            </div>
            <Button
              variant="secondary"
              className="border border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80"
              onClick={() => {
                xpSummaryQuery.refetch();
                avatarQuery.refetch();
              }}
              disabled={xpSummaryQuery.isFetching || avatarQuery.isFetching || avatarQuery.isRefetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${xpSummaryQuery.isFetching || avatarQuery.isFetching || avatarQuery.isRefetching ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
          </div>
        </div>
      </motion.div>

      <XpDashboard
        summary={xpSummaryQuery.data}
        levelInfo={avatarQuery.data ?? undefined}
        lastAwarded={undefined}
      />
    </motion.div>
  );
}
