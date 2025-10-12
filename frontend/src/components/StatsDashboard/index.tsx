import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { FeedbackSummary } from "../../api/client";

interface StatsDashboardProps {
  xpTotals: { total: number; by_category: Record<string, number> } | undefined;
  feedbackSummary: FeedbackSummary | undefined;
}

export function StatsDashboard({ xpTotals, feedbackSummary }: StatsDashboardProps) {
  const chartData = Object.entries(xpTotals?.by_category ?? {}).map(([category, value]) => ({
    category,
    xp: value
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>XP Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-semibold">{xpTotals?.total ?? 0} XP</div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" stroke="#888" />
                <YAxis allowDecimals={false} stroke="#888" />
                <Tooltip />
                <Bar dataKey="xp" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Average rating</span>
            <span className="font-semibold">{(feedbackSummary?.average_rating ?? 0).toFixed(1)}</span>
          </div>
          <Separator />
          <div className="space-y-2">
            {Object.entries(feedbackSummary?.mood_counts ?? {}).map(([mood, count]) => (
              <div key={mood} className="flex items-center justify-between text-sm">
                <span className="capitalize">{mood}</span>
                <span>{count}</span>
              </div>
            ))}
            {feedbackSummary && feedbackSummary.total_feedback === 0 ? (
              <div className="text-sm text-muted-foreground">No feedback yet.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
