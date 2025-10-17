import { useMemo } from "react";

import type { AIInsightsResponse, AIRecommendation } from "../api/client";
import { Button } from "./ui/button";

interface AiAssistPanelProps {
  insights?: AIInsightsResponse;
  isLoading: boolean;
  isError: boolean;
  isRefetching?: boolean;
  onRetry?: () => void;
}

const PRIORITY_COLORS: Record<AIRecommendation["priority"], string> = {
  high: "border-red-400 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200",
  medium: "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200",
  low: "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-200",
};

function formatPercentage(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAverageRating(value: number | null) {
  if (value == null) {
    return "–";
  }
  return `${value.toFixed(1)} ⭐`;
}

export function AiAssistPanel({ insights, isLoading, isError, isRefetching, onRetry }: AiAssistPanelProps) {
  const punctualityEntries = useMemo(() => {
    if (!insights) return [] as Array<[string, number]>;
    return Object.entries(insights.punctuality_stats).sort((a, b) => b[1] - a[1]);
  }, [insights]);

  const reasonEntries = useMemo(() => {
    if (!insights) return [] as Array<[string, number]>;
    return Object.entries(insights.frequent_reasons).sort((a, b) => b[1] - a[1]);
  }, [insights]);

  return (
    <div className="space-y-6 text-gray-700 dark:text-gray-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">AI Insights</h2>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry} disabled={isRefetching}>
            {isRefetching ? "Aktualisiere…" : "Neu laden"}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Lade aktuelle Auswertungen…</p>
      ) : isError ? (
        <div className="space-y-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          <p>Die KI-Auswertung konnte nicht geladen werden.</p>
          {onRetry ? (
            <Button size="sm" onClick={onRetry}>
              Erneut versuchen
            </Button>
          ) : null}
        </div>
      ) : !insights ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Noch keine Feedback-Daten für Empfehlungen vorhanden.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Erfasste Feedbacks</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{insights.total_events}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Erledigungsrate</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatPercentage(insights.completion_rate)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ø Bewertung</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatAverageRating(insights.average_rating)}</p>
            </div>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pünktlichkeit (Top)</h3>
              {punctualityEntries.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {punctualityEntries.map(([label, count]) => (
                    <li key={label} className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span className="capitalize">{label.replace(/_/g, " ")}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Noch keine Angaben zur Pünktlichkeit.</p>
              )}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Gründe (Top)</h3>
              {reasonEntries.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {reasonEntries.map(([label, count]) => (
                    <li key={label} className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span className="capitalize">{label.replace(/_/g, " ")}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Noch keine Gründe erfasst.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Empfehlungen</h3>
            {insights.recommendations.length ? (
              <div className="space-y-3">
                {insights.recommendations.map((recommendation) => (
                  <div
                    key={recommendation.title}
                    className={`rounded-2xl border-l-4 px-4 py-3 shadow-sm ${PRIORITY_COLORS[recommendation.priority]}`}
                  >
                    <p className="text-base font-semibold">{recommendation.title}</p>
                    <p className="text-sm">
                      {recommendation.description}
                    </p>
                    {recommendation.category ? (
                      <p className="mt-1 text-xs uppercase tracking-wide">Kategorie: {recommendation.category}</p>
                    ) : null}
                    <span className="mt-2 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:bg-gray-900/70 dark:text-gray-200">
                      Priorität: {recommendation.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">Derzeit sind keine Empfehlungen erforderlich.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
