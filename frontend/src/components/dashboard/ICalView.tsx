import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DownloadCloud, RefreshCcw } from "lucide-react";

import { fetchImportedCalendars } from "../../api/client";
import { Button } from "../ui/button";
import { ExternalCalendars } from "../ExternalCalendars";

export default function ICalView() {
  const calendarsQuery = useQuery({ queryKey: ["imported-calendars", "overview"], queryFn: fetchImportedCalendars });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 text-slate-100"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-6 shadow-2xl"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Calendar Import</p>
            <h2 className="text-3xl font-bold text-white">Synchronize external calendars</h2>
            <p className="text-sm text-slate-300">
              Verbinde iCal-Feeds, synchronisiere Termine und halte alle Quellen in deinem Unified Dashboard aktuell.
            </p>
          </div>
          <Button
            variant="secondary"
            className="bg-slate-800 text-slate-100 hover:bg-slate-700"
            disabled={calendarsQuery.isFetching}
            onClick={() => calendarsQuery.refetch()}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${calendarsQuery.isFetching ? "animate-spin" : ""}`} /> Aktualisieren
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.section
          layout
          className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur"
        >
          <div className="mb-4 flex items-center gap-3 text-slate-200">
            <DownloadCloud className="h-5 w-5 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">Verbundene Kalender</h3>
          </div>
          <ExternalCalendars />
        </motion.section>
        <motion.section
          layout
          className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur"
        >
          <h3 className="text-lg font-semibold text-white">Tipps für zuverlässige Syncs</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>Nutze HTTPS-Links für iCloud, Google Calendar oder Nextcloud-Feeds.</li>
            <li>Starte nach dem Import eine Synchronisation, um Events sofort zu laden.</li>
            <li>Bei Netzwerkfehlern hilft ein Neustart der Synchronisation aus dem Dashboard.</li>
            <li>Die Health-Checks im Backend melden Probleme automatisch über die Logs.</li>
          </ul>
        </motion.section>
      </div>
    </motion.div>
  );
}
