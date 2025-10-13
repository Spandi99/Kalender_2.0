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
  high: "border-red-400",
  medium: "border-amber-400",
  low: "border-blue-400",
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
    <div className="rounded-lg border border-muted bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Insights</h2>
        {onRetry ? (
          <Button variant="ghost" size="sm" onClick={onRetry} disabled={isRefetching}>
            {isRefetching ? "Aktualisiere…" : "Neu laden"}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade aktuelle Auswertungen…</p>
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-sm text-red-600">Die KI-Auswertung konnte nicht geladen werden.</p>
          {onRetry ? (
            <Button size="sm" onClick={onRetry}>
              Erneut versuchen
            </Button>
          ) : null}
        </div>
      ) : !insights ? (
        <p className="text-sm text-muted-foreground">Noch keine Feedback-Daten für Empfehlungen vorhanden.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Erfasste Feedbacks</p>
              <p className="text-xl font-semibold">{insights.total_events}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Erledigungsrate</p>
              <p className="text-xl font-semibold">{formatPercentage(insights.completion_rate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ø Bewertung</p>
              <p className="text-xl font-semibold">{formatAverageRating(insights.average_rating)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Pünktlichkeit (Top)</h3>
              {punctualityEntries.length ? (
                <ul className="mt-1 space-y-1 text-sm">
                  {punctualityEntries.map(([label, count]) => (
                    <li key={label} className="flex items-center justify-between">
                      <span className="capitalize">{label.replace(/_/g, " ")}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Noch keine Angaben zur Pünktlichkeit.</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Gründe (Top)</h3>
              {reasonEntries.length ? (
                <ul className="mt-1 space-y-1 text-sm">
                  {reasonEntries.map(([label, count]) => (
                    <li key={label} className="flex items-center justify-between">
                      <span className="capitalize">{label.replace(/_/g, " ")}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Noch keine Gründe erfasst.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Empfehlungen</h3>
            {insights.recommendations.length ? (
              <div className="mt-2 space-y-3">
                {insights.recommendations.map((recommendation) => (
                  <div
                    key={recommendation.title}
                    className={`border-l-4 ${PRIORITY_COLORS[recommendation.priority]} bg-muted p-3`}
                  >
                    <p className="font-semibold">{recommendation.title}</p>
                    <p className="text-sm text-muted-foreground">{recommendation.description}</p>
                    {recommendation.category ? (
                      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Kategorie: {recommendation.category}
                      </p>
                    ) : null}
                    <p className="mt-2 inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-medium uppercase text-muted-foreground">
                      Priorität: {recommendation.priority}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Derzeit sind keine Empfehlungen erforderlich.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
