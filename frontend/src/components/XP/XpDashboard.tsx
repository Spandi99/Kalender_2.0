import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

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
}

export function XpDashboard({ summary, lastAwarded }: XpDashboardProps) {
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-1 border-b bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <span role="img" aria-label="trophy">
            🏆
          </span>
          Your XP
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track how each category contributes to your progress.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <div>
          <div className="text-4xl font-bold text-indigo-600">{summary?.total ?? 0}</div>
          <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Total XP</div>
        </div>
        {lastAwarded ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
            +{lastAwarded} XP earned!
          </div>
        ) : null}
        <div className="space-y-3">
          {categories.length ? (
            categories.map((category) => (
              <div key={category.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm font-medium">
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
            <div className="rounded-md border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
              Complete events to start earning XP and unlock progress insights.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
