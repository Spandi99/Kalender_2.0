import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, Clock3, Loader2, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { CalendarEvent, SystemLogEntry, SystemHealthStatus } from "../../api/client";
import {
  fetchEvents,
  fetchSystemHealth,
  fetchSystemLogs,
} from "../../api/client";
import { CalendarView as SchedulerCalendar } from "../CalendarView";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface SelectedDetails {
  event?: CalendarEvent;
  range?: { start: Date; end: Date };
}

function resolveNextEvent(events: CalendarEvent[]) {
  const now = Date.now();
  const upcoming = events
    .filter((event) => new Date(event.end).getTime() > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return upcoming[0] ?? null;
}

function formatDateRange(event: CalendarEvent) {
  const formatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `${formatter.format(new Date(event.start))} – ${formatter.format(new Date(event.end))}`;
}

function formatRange(range?: { start: Date; end: Date }) {
  if (!range) return "";
  const formatter = new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `${formatter.format(range.start)} – ${formatter.format(range.end)}`;
}

const STATUS_BADGES: Record<SystemHealthStatus["status"] | "recovering", string> = {
  ok: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-600",
  recovering: "bg-amber-100 text-amber-700",
};

export default function CalendarView() {
  const navigate = useNavigate();
  const [details, setDetails] = useState<SelectedDetails | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const eventsQuery = useQuery({
    queryKey: ["events", "dashboard"],
    queryFn: fetchEvents,
    refetchInterval: 60_000,
  });

  const healthQuery = useQuery({
    queryKey: ["system", "health", "calendar"],
    queryFn: fetchSystemHealth,
    refetchInterval: 60_000,
  });

  const logsQuery = useQuery<SystemLogEntry[]>({
    queryKey: ["system", "logs", "calendar"],
    queryFn: fetchSystemLogs,
    enabled: logsOpen,
    refetchInterval: 60_000,
  });

  const events = eventsQuery.data ?? [];
  const upcoming = useMemo(() => resolveNextEvent(events), [events]);

  const status = healthQuery.data?.self_healing_active
    ? healthQuery.data.status
    : "recovering";
  const statusBadge = STATUS_BADGES[status as keyof typeof STATUS_BADGES] ?? "bg-blue-100 text-blue-700";

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-5 shadow-lg dark:border-blue-900/40 dark:from-blue-950 dark:via-gray-950 dark:to-purple-950"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-300">System insights</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Unified calendar overview</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Plane Events, prüfe Self-Healing-Status und halte Templates griffbereit – alles ohne die Seite zu verlassen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => eventsQuery.refetch()} disabled={eventsQuery.isFetching}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${eventsQuery.isFetching ? "animate-spin" : ""}`} /> Aktualisieren
            </Button>
            <Button onClick={() => navigate("/dashboard/templates")}>Template-Manager</Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <motion.section
          layout
          className="flex min-h-[540px] flex-col rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900/80"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Kalender</h3>
            </div>
          </div>

          {eventsQuery.isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-600">
              <Loader2 className="mb-3 h-6 w-6 animate-spin" />
              Events werden geladen…
            </div>
          ) : (
            <SchedulerCalendar
              events={events}
              onSelectRange={(range) => setDetails({ range })}
              onEventClick={(eventId) => {
                const event = events.find((item) => item.id === eventId);
                if (event) {
                  setDetails({ event });
                }
              }}
              timeZone="Europe/Zurich"
              locale="de"
            />
          )}
        </motion.section>

        <motion.aside
          layout
          className="space-y-4 rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900/80"
        >
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nächster Termin</h4>
            {upcoming ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm shadow-inner dark:border-blue-900/50 dark:bg-blue-950/60">
                <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">{upcoming.title}</p>
                <p className="mt-1 text-gray-700 dark:text-gray-200">{formatDateRange(upcoming)}</p>
                {upcoming.description ? (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{upcoming.description}</p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                Keine kommenden Termine – nutze Templates oder lege neue Events direkt im Kalender an.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">System Health</h4>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusBadge}`}>
                {status === "ok" ? "Stable" : status === "error" ? "Error" : "Recovering"}
              </span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>Self-Healing aktiv: {healthQuery.data?.self_healing_active ? "Ja" : "Nein"}</li>
              <li>Letzte Aktion: {healthQuery.data?.last_recovery_action ?? "–"}</li>
              <li>Logs verfügbar: {healthQuery.data?.system_log_entries ?? 0}</li>
              <li>Zuletzt geprüft: {healthQuery.data?.last_recovery_run ? new Date(healthQuery.data.last_recovery_run).toLocaleString("de-CH") : "–"}</li>
            </ul>
            <Button variant="outline" onClick={() => setLogsOpen(true)} className="w-full">
              Logs ansehen
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ausgewählter Bereich</h4>
            {details?.range ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm shadow-inner dark:border-gray-700 dark:bg-gray-800/60">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{formatRange(details.range)}</p>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Öffne Templates, um Zeitblöcke zu füllen, oder lege ein neues Event direkt im Kalender an.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => navigate("/dashboard/templates")}>Templates öffnen</Button>
                  <Button size="sm" variant="outline" onClick={() => setDetails(null)}>
                    Auswahl zurücksetzen
                  </Button>
                </div>
              </div>
            ) : details?.event ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm shadow-inner dark:border-gray-700 dark:bg-gray-800/60">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{details.event.title}</p>
                <p className="mt-1 text-gray-700 dark:text-gray-300">{formatDateRange(details.event)}</p>
                {details.event.description ? (
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{details.event.description}</p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => navigate("/dashboard/feedback")}>Feedback einsehen</Button>
                  <Button size="sm" variant="outline" onClick={() => setDetails(null)}>
                    Schließen
                  </Button>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                Wähle ein Event oder Zeitfenster im Kalender aus, um Details und Aktionen hier zu sehen.
              </p>
            )}
          </div>
        </motion.aside>
      </div>

      <Dialog open={Boolean(details?.event)} onOpenChange={(open) => (!open ? setDetails(null) : null)}>
        <DialogContent className="sm:max-w-lg">
          {details?.event ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl text-gray-900 dark:text-gray-100">
                  <Clock3 className="h-5 w-5 text-blue-500" />
                  {details.event.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
                  {formatDateRange(details.event)}
                </DialogDescription>
              </DialogHeader>
              {details.event.description ? (
                <p className="py-4 text-sm text-gray-700 dark:text-gray-200">{details.event.description}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetails(null)}>
                  Schließen
                </Button>
                <Button onClick={() => navigate("/dashboard/feedback")}>Feedback öffnen</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 dark:text-gray-100">System-Logs</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
              Self-Healing Aktionen und Systemmeldungen der letzten Stunden.
            </DialogDescription>
          </DialogHeader>
          {logsQuery.isLoading ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">Logs werden geladen…</p>
          ) : logsQuery.isError ? (
            <p className="text-sm text-red-600">Logs konnten nicht geladen werden.</p>
          ) : logsQuery.data?.length ? (
            <ul className="space-y-3">
              {logsQuery.data.map((log) => (
                <li key={log.id} className="rounded-2xl border border-gray-200 bg-white/90 p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {new Date(log.timestamp).toLocaleString("de-CH")}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {log.severity ?? "info"}
                    </span>
                  </div>
                  {log.component ? (
                    <p className="mt-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{log.component}</p>
                  ) : null}
                  {log.message ? (
                    <p className="mt-2 text-gray-700 dark:text-gray-200">{log.message}</p>
                  ) : null}
                  {log.action_taken ? (
                    <p className="mt-2 text-sm text-blue-600 dark:text-blue-300">Aktion: {log.action_taken}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Status: {log.resolved ? "✅ Behoben" : "⏳ Offen"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">Keine Log-Einträge vorhanden.</p>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
