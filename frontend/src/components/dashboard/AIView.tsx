import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, RefreshCcw, Sparkles } from "lucide-react";

import { fetchAiInsights } from "../../api/client";
import { AiAssistPanel } from "../AiAssistPanel";
import { LearningSuggestionsCard } from "../LearningSuggestionsCard";
import { Button } from "../ui/button";

export default function AIView() {
  const insightsQuery = useQuery({
    queryKey: ["ai", "insights", "dashboard"],
    queryFn: fetchAiInsights,
    refetchInterval: 60_000,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-blue-50 px-6 py-5 shadow-lg dark:border-purple-900/40 dark:from-purple-950 dark:via-gray-950 dark:to-blue-950"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-500 dark:text-purple-300">AI Insights</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Selbstoptimierende Assistenten</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Kombiniere datengetriebene Empfehlungen und lernende Templates, um deinen Alltag zu automatisieren.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => insightsQuery.refetch()}
              disabled={insightsQuery.isFetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${insightsQuery.isFetching ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm dark:border-purple-900/40 dark:bg-gray-900/60 dark:text-gray-200">
              <Sparkles className="h-4 w-4 text-purple-500" />
              KI aktiv
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <motion.div
          layout
          className="rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900/80"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Insights &amp; Feedback</h3>
            </div>
          </div>
          <AiAssistPanel
            insights={insightsQuery.data}
            isLoading={insightsQuery.isLoading}
            isError={Boolean(insightsQuery.error)}
            isRefetching={insightsQuery.isFetching}
            onRetry={() => insightsQuery.refetch()}
          />
        </motion.div>

        <motion.div
          layout
          className="rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900/80"
        >
          <LearningSuggestionsCard />
        </motion.div>
      </div>
    </motion.div>
  );
}
