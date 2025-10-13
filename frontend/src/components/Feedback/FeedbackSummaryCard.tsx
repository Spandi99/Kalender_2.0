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
    <Card>
      <CardHeader>
        <CardTitle>Feedback Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-muted-foreground/10 bg-white p-4">
            <div className="text-3xl font-semibold">{average}</div>
            <p className="text-sm text-muted-foreground">Average rating</p>
          </div>
          <div className="rounded-lg border border-muted-foreground/10 bg-white p-4">
            <div className="text-3xl font-semibold">{completionRate}%</div>
            <p className="text-sm text-muted-foreground">Completion rate</p>
          </div>
        </div>
        <div className="rounded-md border border-muted-foreground/20 bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {total} feedbacks
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          {moodEntries.length ? (
            moodEntries.map(([mood, count]) => (
              <div key={mood} className="flex items-center justify-between rounded-md border border-muted-foreground/10 bg-white px-3 py-2">
                <span className="font-medium">{mood}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-muted-foreground/30 p-4 text-muted-foreground">
              No feedback yet. Complete an event to share how it went!
            </div>
          )}
        </div>
        {punctualityEntries.length > 0 && (
          <div className="space-y-2 text-sm">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Punctuality</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              {punctualityEntries.map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-md border border-muted-foreground/10 bg-white px-3 py-2 text-center"
                >
                  <div className="text-sm font-medium capitalize">{label.replace("_", " ")}</div>
                  <div className="text-muted-foreground">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
