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
        className="flex flex-col gap-4 rounded-3xl border border-slate-700/80 bg-slate-950/85 px-6 py-6 shadow-2xl"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-accent">Feedback &amp; Mood</p>
            <h2 className="text-3xl font-bold text-slate-100">Erfahrungen im Blick</h2>
            <p className="text-sm text-slate-300">
              Analysiere Stimmung, Gründe und Pünktlichkeit, um Self-Healing-Regeln anzupassen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              className="border border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80"
              onClick={() => feedbackQuery.refetch()}
              disabled={feedbackQuery.isFetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${feedbackQuery.isFetching ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/15 px-3 py-2 text-sm font-semibold text-brand-primary">
              <MessageCircle className="h-4 w-4" />
              {feedbackQuery.data?.total_feedback ?? 0} Einträge
            </div>
          </div>
        </div>
      </motion.div>

      <FeedbackSummaryCard summary={feedbackQuery.data} />
    </motion.div>
  );
}
