import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import type { FeedbackSummary } from "../../api/client";

interface FeedbackSummaryCardProps {
  summary?: FeedbackSummary;
}

export function FeedbackSummaryCard({ summary }: FeedbackSummaryCardProps) {
  const average = summary ? summary.average_rating.toFixed(1) : "0.0";
  const total = summary?.total_feedback ?? 0;
  const moodEntries = Object.entries(summary?.mood_counts ?? {});
  const completionRate = summary ? Math.round(summary.completion_rate * 100) : 0;
  const punctualityEntries = Object.entries(summary?.punctuality_distribution ?? {});

  return (
    <Card className="border border-teal-100 shadow-xl dark:border-teal-900/40">
      <CardHeader className="border-b border-teal-100 bg-gradient-to-r from-teal-500/10 via-teal-400/10 to-blue-400/10 dark:border-teal-900/40 dark:from-teal-900/40 dark:via-teal-900/20 dark:to-blue-900/20">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Feedback Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6 text-sm text-gray-700 dark:text-gray-300">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="text-3xl font-semibold text-teal-600 dark:text-teal-300">{average}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Durchschnittliche Bewertung</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="text-3xl font-semibold text-teal-600 dark:text-teal-300">{completionRate}%</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Erledigungsrate</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700 shadow-inner dark:border-teal-900/40 dark:bg-teal-900/40 dark:text-teal-200">
          {total} Feedbacks
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          {moodEntries.length ? (
            moodEntries.map(([mood, count]) => (
              <div
                key={mood}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/80 px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
              >
                <span className="font-medium text-gray-800 dark:text-gray-100">{mood}</span>
                <span className="text-gray-600 dark:text-gray-300">{count}</span>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Noch kein Feedback vorhanden. Fülle ein Event aus, um Erfahrungen zu teilen!
            </div>
          )}
        </div>
        {punctualityEntries.length > 0 && (
          <div className="space-y-2 text-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pünktlichkeit</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {punctualityEntries.map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
                >
                  <div className="text-sm font-medium capitalize text-gray-800 dark:text-gray-100">{label.replace("_", " ")}</div>
                  <div className="text-gray-600 dark:text-gray-300">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
