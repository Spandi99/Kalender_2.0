import { useMemo } from "react";

import { AvatarDisplay } from "../Avatar/AvatarDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { AvatarStatus } from "../../lib/useAvatar";

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  Work: { icon: "💼", label: "Work" },
  Exercise: { icon: "💪", label: "Exercise" },
  Study: { icon: "📚", label: "Study" },
  Other: { icon: "⭐", label: "Other" },
};

export interface XpSummaryPayload {
  total: number;
  by_category: Record<string, number>;
}

interface XpDashboardProps {
  summary?: XpSummaryPayload;
  lastAwarded?: number | null;
  levelInfo?: AvatarStatus;
}

export function XpDashboard({ summary, lastAwarded, levelInfo }: XpDashboardProps) {
  const categories = useMemo(() => {
    const entries = Object.entries(summary?.by_category ?? {});
    if (!entries.length) {
      return [];
    }
    return entries
      .map(([key, value]) => {
        const meta = CATEGORY_META[key] ?? { icon: "🗂️", label: key };
        return {
          key,
          display: meta.label,
          icon: meta.icon,
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [summary?.by_category]);

  const maxValue = useMemo(() => {
    if (!categories.length) return 0;
    return categories.reduce((max, category) => Math.max(max, category.value), 0);
  }, [categories]);

  const xpLabel = levelInfo?.xp_next
    ? `${levelInfo.xp_current} / ${levelInfo.xp_next} XP`
    : `${levelInfo?.xp_current ?? 0} XP`;

  return (
    <Card className="overflow-hidden border border-slate-700/80 bg-slate-950/85 text-slate-100 shadow-2xl">
      <CardHeader className="space-y-1 border-b border-slate-700/70 bg-slate-900/60">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <span role="img" aria-label="trophy">
            🏆
          </span>
          XP Übersicht
        </CardTitle>
        <p className="text-sm text-slate-300">
          Verfolge, wie deine Kategorien zum Fortschritt beitragen.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-4 text-slate-200 sm:p-6">
        <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-3xl font-bold text-brand-primary sm:text-4xl">{summary?.total ?? 0}</div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">Gesamt-XP</div>
              <div className="text-sm text-slate-300">{xpLabel}</div>
            </div>
            {levelInfo ? (
              <AvatarDisplay
                level={levelInfo.current_level}
                avatarState={levelInfo.avatar_state}
                expression={levelInfo.expression}
                xpCurrent={levelInfo.xp_current}
                xpNext={levelInfo.xp_next ?? undefined}
                xpPrevious={levelInfo.xp_previous}
                levelProgress={levelInfo.level_progress}
                xpToNext={levelInfo.xp_to_next}
              />
            ) : null}
          </div>
          {lastAwarded ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 shadow-inner">
              +{lastAwarded} XP erhalten!
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Kategorien</h3>
          {categories.length ? (
            categories.map((category) => (
              <div key={category.key} className="space-y-1 rounded-xl border border-slate-700 bg-slate-900/70 p-3 shadow-lg">
                <div className="flex flex-col gap-2 text-sm font-medium text-slate-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span aria-hidden>{category.icon}</span>
                    <span>{category.display}</span>
                  </div>
                  <span className="text-sm text-slate-300 sm:text-right">{category.value} XP</span>
                </div>
                <Progress
                  value={maxValue ? Math.min(100, (category.value / maxValue) * 100) : 0}
                  className="h-2 bg-slate-800/80"
                />
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              Sammle XP, um hier Einblicke in deine stärksten Kategorien zu sehen.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
