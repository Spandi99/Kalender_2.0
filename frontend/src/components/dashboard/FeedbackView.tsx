import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCircle, RefreshCcw } from "lucide-react";

import { fetchFeedbackSummary } from "../../api/client";
import { FeedbackSummaryCard } from "../Feedback/FeedbackSummaryCard";
import { Button } from "../ui/button";

export default function FeedbackView() {
  const feedbackQuery = useQuery({
    queryKey: ["feedback", "summary", "dashboard"],
    queryFn: fetchFeedbackSummary,
    refetchInterval: 60_000,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 px-6 py-5 shadow-lg dark:border-teal-900/40 dark:from-teal-950 dark:via-gray-950 dark:to-emerald-950"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-500 dark:text-teal-300">Feedback &amp; Mood</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Erfahrungen im Blick</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Analysiere Stimmung, Gründe und Pünktlichkeit, um Self-Healing-Regeln anzupassen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => feedbackQuery.refetch()}
              disabled={feedbackQuery.isFetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${feedbackQuery.isFetching ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm dark:border-teal-900/40 dark:bg-gray-900/60 dark:text-gray-200">
              <MessageCircle className="h-4 w-4 text-teal-500" />
              {feedbackQuery.data?.total_feedback ?? 0} Einträge
            </div>
          </div>
        </div>
      </motion.div>

      <FeedbackSummaryCard summary={feedbackQuery.data} />
    </motion.div>
  );
}
