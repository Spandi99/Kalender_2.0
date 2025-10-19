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
    <Card className="border border-slate-700/80 bg-slate-950/85 text-slate-200 shadow-2xl">
      <CardHeader className="border-b border-slate-700/70 bg-slate-900/60">
        <CardTitle className="text-lg font-semibold text-slate-100">Feedback Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6 text-sm text-slate-200">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
            <div className="text-3xl font-semibold text-brand-accent">{average}</div>
            <p className="text-sm text-slate-400">Durchschnittliche Bewertung</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
            <div className="text-3xl font-semibold text-brand-accent">{completionRate}%</div>
            <p className="text-sm text-slate-400">Erledigungsrate</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary shadow-inner">
          {total} Feedbacks
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          {moodEntries.length ? (
            moodEntries.map(([mood, count]) => (
              <div
                key={mood}
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 shadow-lg"
              >
                <span className="font-medium text-slate-100">{mood}</span>
                <span className="text-slate-300">{count}</span>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              Noch kein Feedback vorhanden. Fülle ein Event aus, um Erfahrungen zu teilen!
            </div>
          )}
        </div>
        {punctualityEntries.length > 0 && (
          <div className="space-y-2 text-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pünktlichkeit</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {punctualityEntries.map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-center shadow-lg"
                >
                  <div className="text-sm font-medium capitalize text-slate-100">{label.replace("_", " ")}</div>
                  <div className="text-slate-300">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
