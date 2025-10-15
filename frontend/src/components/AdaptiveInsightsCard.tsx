import { useMemo, useState } from "react";

import { type AdaptiveAnalysis, runAdaptiveAnalysis } from "../api/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

function formatHourList(hours: number[]) {
  if (!hours.length) {
    return "-";
  }
  return hours
    .slice()
    .sort((a, b) => a - b)
    .map((hour) => `${hour.toString().padStart(2, "0")}:00`)
    .join(", ");
}

function buildSuggestions(analysis: AdaptiveAnalysis): string[] {
  const suggestions: string[] = [];
  const completionRate = analysis.avg_completion_rate;
  const mood = analysis.avg_mood;

  if (completionRate >= 0.8) {
    suggestions.push("Great job! Your completion streak is strong – keep reinforcing your routine.");
  } else if (completionRate <= 0.5) {
    suggestions.push("Consider shortening or rescheduling difficult blocks to improve completion consistency.");
  }

  if (analysis.productive_hours.length) {
    const avgHour =
      analysis.productive_hours.reduce((total, hour) => total + hour, 0) /
      analysis.productive_hours.length;
    if (avgHour >= 18) {
      suggestions.push("You tend to be productive in the evening. Shift learning or focus blocks later in the day.");
    } else if (avgHour >= 9) {
      suggestions.push("Your productivity peaks after 9 AM. Try aligning deep work blocks with this window.");
    } else {
      suggestions.push("Morning productivity is high. Keep important tasks earlier to maintain momentum.");
    }
  }

  if (mood >= 4) {
    suggestions.push("High mood feedback detected – reward yourself or schedule another challenging block.");
  } else if (mood > 0 && mood < 3) {
    suggestions.push("Mood is dipping. Introduce breaks or lighter tasks to recover energy.");
  }

  const streakHighlights = Object.entries(analysis.discipline_streaks)
    .filter(([, streak]) => streak >= 2)
    .map(([category, streak]) => ({ category, streak }));

  if (streakHighlights.length) {
    const categories = streakHighlights.map((item) => `${item.category} (${item.streak})`).join(", ");
    suggestions.push(`Discipline streaks spotted in: ${categories}. Keep stacking those wins!`);
  }

  return suggestions;
}

export function AdaptiveInsightsCard() {
  const [analysis, setAnalysis] = useState<AdaptiveAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    if (!analysis) {
      return [];
    }
    return buildSuggestions(analysis);
  }, [analysis]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await runAdaptiveAnalysis();
      setAnalysis(response.analysis);
    } catch (err) {
      setError("Unable to analyze behaviour right now. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Adaptive Insights</CardTitle>
        <Button onClick={handleAnalyze} disabled={isLoading} variant="outline" size="sm">
          {isLoading ? "Analyzing..." : "Analyze & Adapt"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-muted-foreground/10 bg-white p-3">
                <div className="text-xl font-semibold text-foreground">
                  {analysis ? `${(analysis.avg_completion_rate * 100).toFixed(1)}%` : "--"}
                </div>
                <div>Average completion rate</div>
              </div>
              <div className="rounded-md border border-muted-foreground/10 bg-white p-3">
                <div className="text-xl font-semibold text-foreground">
                  {analysis && analysis.avg_mood > 0 ? analysis.avg_mood.toFixed(2) : "--"}
                </div>
                <div>Average mood rating</div>
              </div>
            </div>
            <div className="rounded-md border border-muted-foreground/10 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Productive hours
              </div>
              <div className="text-foreground">{analysis ? formatHourList(analysis.productive_hours) : "--"}</div>
            </div>
            {suggestions.length ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommendations
                </div>
                <ul className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <li
                      key={suggestion}
                      className="rounded-md border border-muted-foreground/10 bg-white px-3 py-2 text-foreground"
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-4 text-center text-muted-foreground">
                Run the analysis to uncover adaptive scheduling tips.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
