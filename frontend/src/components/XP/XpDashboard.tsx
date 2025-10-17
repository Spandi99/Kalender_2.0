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
    <Card className="overflow-hidden border border-blue-100 shadow-xl dark:border-blue-900/40">
      <CardHeader className="space-y-1 border-b border-blue-100 bg-gradient-to-r from-blue-500/10 via-blue-400/10 to-purple-500/10 dark:border-blue-900/40 dark:from-blue-900/40 dark:via-blue-900/20 dark:to-purple-900/20">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          <span role="img" aria-label="trophy">
            🏆
          </span>
          XP Übersicht
        </CardTitle>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Verfolge, wie deine Kategorien zum Fortschritt beitragen.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-300">{summary?.total ?? 0}</div>
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Gesamt-XP</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">{xpLabel}</div>
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
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-inner dark:border-emerald-900/60 dark:bg-emerald-900/40 dark:text-emerald-200">
              +{lastAwarded} XP erhalten!
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Kategorien</h3>
          {categories.length ? (
            categories.map((category) => (
              <div key={category.key} className="space-y-1 rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
                <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-200">
                  <div className="flex items-center gap-2">
                    <span aria-hidden>{category.icon}</span>
                    <span>{category.display}</span>
                  </div>
                  <span>{category.value} XP</span>
                </div>
                <Progress
                  value={maxValue ? Math.min(100, (category.value / maxValue) * 100) : 0}
                  className="h-2"
                />
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Sammle XP, um hier Einblicke in deine stärksten Kategorien zu sehen.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
