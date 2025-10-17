import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Blocks, RefreshCcw } from "lucide-react";

import { fetchEventCategories } from "../../api/client";
import { TemplateManager } from "../TemplateManager";
import { Button } from "../ui/button";

export default function TemplatesView() {
  const categoriesQuery = useQuery({
    queryKey: ["event", "categories"],
    queryFn: fetchEventCategories,
    refetchInterval: 5 * 60_000,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-6 py-5 shadow-lg dark:border-indigo-900/40 dark:from-indigo-950 dark:via-gray-950 dark:to-blue-950"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">Templates</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Zeitblöcke orchestrieren</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Verwalte Tagesvorlagen, optimiere Blöcke mit KI-Empfehlungen und plane mit einem Klick.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => categoriesQuery.refetch()}
              disabled={categoriesQuery.isFetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${categoriesQuery.isFetching ? "animate-spin" : ""}`} />
              Kategorien aktualisieren
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm dark:border-indigo-900/40 dark:bg-gray-900/60 dark:text-gray-200">
              <Blocks className="h-4 w-4 text-indigo-500" />
              {categoriesQuery.data?.length ?? 0} Kategorien
            </div>
          </div>
        </div>
      </motion.div>

      <TemplateManager categories={categoriesQuery.data ?? []} />
    </motion.div>
  );
}
