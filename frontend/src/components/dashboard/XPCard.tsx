import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Award, TrendingUp } from "lucide-react";
import { CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

import type { LevelStatus, XpSummary } from "../../api/client";
import { fetchLevelStatus, fetchXpSummary } from "../../api/client";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

function formatLevelProgress(levelStatus?: LevelStatus) {
  if (!levelStatus) {
    return { label: "Lade", progress: 0 };
  }

  const totalForLevel = (levelStatus.xp_next ?? levelStatus.xp_current) - levelStatus.xp_previous;
  const gained = levelStatus.xp_current - levelStatus.xp_previous;
  const progress = totalForLevel > 0 ? Math.min(100, Math.round((gained / totalForLevel) * 100)) : levelStatus.progress;
  return { label: `Level ${levelStatus.current_level}`, progress };
}

function normalizeCategoryBreakdown(summary?: XpSummary) {
  if (!summary) return [] as Array<[string, number]>;
  return Object.entries(summary.by_category ?? {})
    .map(([category, value]) => [category, value] as [string, number])
    .sort((a, b) => b[1] - a[1]);
}

export function XPCard() {
  const [open, setOpen] = useState(false);

  const xpSummaryQuery = useQuery({
    queryKey: ["xp", "summary"],
    queryFn: fetchXpSummary,
    refetchInterval: 60_000,
  });

  const levelStatusQuery = useQuery({
    queryKey: ["xp", "level-status"],
    queryFn: fetchLevelStatus,
    refetchInterval: 60_000,
  });

  const levelProgress = useMemo(() => formatLevelProgress(levelStatusQuery.data), [levelStatusQuery.data]);
  const categories = useMemo(() => normalizeCategoryBreakdown(xpSummaryQuery.data), [xpSummaryQuery.data]);

  return (
    <>
      <motion.div
        layout
        onClick={() => {
          if (!xpSummaryQuery.isLoading) setOpen(true);
        }}
        className="group cursor-pointer rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-lg transition hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/70"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">XP-Level</p>
            <h3 className="mt-1 text-2xl font-semibold">{levelProgress.label}</h3>
          </div>
          <Award className="h-8 w-8 text-amber-500" />
        </div>

        <div className="mt-5 flex items-center gap-5">
          <div className="h-28 w-28">
            <CircularProgressbarWithChildren
              value={levelProgress.progress}
              strokeWidth={10}
              styles={buildStyles({
                pathColor: "#22c55e",
                trailColor: "#e2e8f0",
                textColor: "#0f172a",
              })}
            >
              <span className="text-lg font-semibold">{levelProgress.progress}%</span>
              <span className="text-xs text-slate-500">Fortschritt</span>
            </CircularProgressbarWithChildren>
          </div>
          <div className="flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Gesamt-XP: <span className="font-semibold">{xpSummaryQuery.data?.total ?? "–"}</span>
            </p>
            <p>
              Aktuelle XP: <span className="font-semibold">{levelStatusQuery.data?.xp_current ?? "–"}</span>
            </p>
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-200">
              <TrendingUp className="h-4 w-4" />
              {levelStatusQuery.data?.avatar_state ?? "Progress"}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-blue-500 group-hover:text-blue-600">
          Details anzeigen
        </p>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>XP-Fortschritt &amp; Kategorien</DialogTitle>
            <DialogDescription>
              Überblick über Level-Status, verbleibende XP und Kategorien mit den meisten Punkten.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Level Details</h4>
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                <li>
                  Aktueller Level: <span className="font-semibold">{levelStatusQuery.data?.current_level ?? "–"}</span>
                </li>
                <li>
                  XP bis Level-Up: <span className="font-semibold">{levelStatusQuery.data?.xp_next != null ? Math.max(0, levelStatusQuery.data.xp_next - levelStatusQuery.data.xp_current) : "Maximallevel"}</span>
                </li>
                <li>
                  Letzte Avatar-Laune: <span className="font-semibold">{levelStatusQuery.data?.expression ?? "–"}</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Top Kategorien</h4>
              {categories.length ? (
                <ul className="space-y-2 text-sm">
                  {categories.map(([category, value]) => (
                    <li key={category} className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 shadow-sm dark:bg-slate-800/60">
                      <span className="font-medium capitalize">{category}</span>
                      <span className="font-semibold">{value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Noch keine Kategorien ausgewertet.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Schließen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
