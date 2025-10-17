import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Award, RefreshCcw } from "lucide-react";

import type { LevelStatus, XpSummary } from "../../api/client";
import { fetchLevelStatus, fetchXpSummary } from "../../api/client";
import { XpDashboard } from "../XP/XpDashboard";
import { Button } from "../ui/button";

function computeDailyAverage(summary?: XpSummary, level?: LevelStatus) {
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

  const levelStatusQuery = useQuery({
    queryKey: ["xp", "level-status", "dashboard"],
    queryFn: fetchLevelStatus,
    refetchInterval: 60_000,
  });

  const averagePerDay = useMemo(
    () => computeDailyAverage(xpSummaryQuery.data, levelStatusQuery.data),
    [xpSummaryQuery.data, levelStatusQuery.data]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-rose-50 px-6 py-5 shadow-lg dark:border-amber-900/40 dark:from-amber-950 dark:via-gray-950 dark:to-rose-950"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-300">XP &amp; Level</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gamified Progress</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Analysiere deinen Fortschritt nach Kategorie, Level und Stimmung deines Avatars.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm dark:border-amber-900/40 dark:bg-gray-900/60 dark:text-gray-200">
              <Award className="h-4 w-4 text-amber-500" />
              {averagePerDay} XP pro Level
            </div>
            <Button
              variant="outline"
              onClick={() => {
                xpSummaryQuery.refetch();
                levelStatusQuery.refetch();
              }}
              disabled={xpSummaryQuery.isFetching || levelStatusQuery.isFetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${xpSummaryQuery.isFetching || levelStatusQuery.isFetching ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
          </div>
        </div>
      </motion.div>

      <XpDashboard
        summary={xpSummaryQuery.data}
        levelInfo={levelStatusQuery.data as LevelStatus | undefined}
        lastAwarded={undefined}
      />
    </motion.div>
  );
}
