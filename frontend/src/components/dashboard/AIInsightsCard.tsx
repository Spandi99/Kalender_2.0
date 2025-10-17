import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BrainCircuit, Lightbulb, RefreshCcw } from "lucide-react";

import type { AIInsightsResponse, AIRecommendation } from "../../api/client";
import { fetchAiInsights } from "../../api/client";
import { AiAssistPanel } from "../AiAssistPanel";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

const ICONS: Record<AIRecommendation["priority"], ReactNode> = {
  high: <Lightbulb className="h-5 w-5 text-red-500" />,
  medium: <Lightbulb className="h-5 w-5 text-amber-500" />,
  low: <Lightbulb className="h-5 w-5 text-blue-500" />,
};

function getTopRecommendations(insights?: AIInsightsResponse) {
  if (!insights) return [] as AIRecommendation[];
  return insights.recommendations.slice(0, 3);
}

export function AIInsightsCard() {
  const [open, setOpen] = useState(false);
  const insightsQuery = useQuery({
    queryKey: ["ai", "insights"],
    queryFn: fetchAiInsights,
    refetchInterval: 60_000,
  });

  const recommendations = getTopRecommendations(insightsQuery.data);

  return (
    <>
      <motion.div
        layout
        className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-lg transition hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/70"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">AI Insights</p>
            <h3 className="mt-1 text-2xl font-semibold">Empfehlungen</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => insightsQuery.refetch()}
            disabled={insightsQuery.isFetching}
            aria-label="Neu laden"
          >
            <RefreshCcw className={`h-4 w-4 ${insightsQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {insightsQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Lade aktuelle Empfehlungen…</p>
        ) : insightsQuery.isError ? (
          <p className="mt-4 text-sm text-red-500">Empfehlungen konnten nicht geladen werden.</p>
        ) : recommendations.length ? (
          <ul className="mt-4 space-y-3 text-sm">
            {recommendations.map((recommendation) => (
              <li
                key={recommendation.title}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  {ICONS[recommendation.priority]}
                </div>
                <div>
                  <p className="font-semibold">{recommendation.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{recommendation.description}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            <BrainCircuit className="h-5 w-5" />
            <span>Alles im grünen Bereich – aktuell keine dringenden Empfehlungen.</span>
          </div>
        )}

        <Button className="mt-5 w-full" variant="secondary" onClick={() => setOpen(true)}>
          Vollständige Analyse öffnen
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Insights &amp; Feedback</DialogTitle>
          </DialogHeader>
          <AiAssistPanel
            insights={insightsQuery.data}
            isLoading={insightsQuery.isLoading}
            isError={Boolean(insightsQuery.error)}
            isRefetching={insightsQuery.isFetching}
            onRetry={() => insightsQuery.refetch()}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
