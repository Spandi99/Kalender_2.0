import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCcw,
  Sparkles,
} from "lucide-react";

import {
  fetchEvents,
  fetchSystemHealth,
  fetchSystemLogs,
  fetchSystemMetrics,
  type CalendarEvent,
  type SystemHealthStatus,
  type SystemLogEntry,
  type SystemMetrics,
} from "../../api/client";
import { formatDateTime } from "../../lib/datetime";
import NextEventWidget from "../widgets/NextEventWidget";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface UpcomingSnapshot {
  title: string;
  start: Date;
  end: Date | null;
  description?: string | null;
}

function resolveUpcoming(events: CalendarEvent[]): UpcomingSnapshot[] {
  const now = Date.now();
  return events
    .filter((event) => new Date(event.end).getTime() > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5)
    .map((event) => ({
      title: event.title,
      start: new Date(event.start),
      end: event.end ? new Date(event.end) : null,
      description: event.description,
    }));
}

function formatRange(start: Date, end: Date | null): string {
  const startText = formatDateTime(start);
  const endText = end && !Number.isNaN(end.getTime()) ? formatDateTime(end) : null;
  if (!startText) {
    return "–";
  }
  return endText && endText !== startText ? `${startText} – ${endText}` : startText;
}

function resolveStatusColor(status: SystemHealthStatus["status"] | "recovering") {
  switch (status) {
    case "ok":
      return "text-emerald-200 bg-emerald-500/10 border-emerald-500/30";
    case "error":
      return "text-rose-200 bg-rose-500/10 border-rose-500/30";
    case "recovering":
    default:
      return "text-amber-200 bg-amber-500/10 border-amber-500/30";
  }
}

function formatLog(entry: SystemLogEntry): { time: string; message: string } {
  const timestamp = entry.timestamp ? formatDateTime(entry.timestamp) : null;
  const timeText = timestamp ?? "–";
  const message = entry.message ?? "Unbekannte Meldung";
  return { time: timeText, message };
}

export default function OverviewView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({
    queryKey: ["events", "overview"],
    queryFn: fetchEvents,
    initialData: () => queryClient.getQueryData<CalendarEvent[]>(["events", "dashboard"]),
    refetchInterval: 60_000,
  });

  const healthQuery = useQuery({
    queryKey: ["system", "health", "overview"],
    queryFn: fetchSystemHealth,
    refetchInterval: 60_000,
  });

  const logsQuery = useQuery({
    queryKey: ["system", "logs", "overview"],
    queryFn: fetchSystemLogs,
    refetchInterval: 120_000,
    staleTime: 120_000,
    select: (entries) => entries.slice(0, 6),
  });

  const events = eventsQuery.data ?? [];
  const upcomingEvents = useMemo(() => resolveUpcoming(events), [events]);
  const health = healthQuery.data;
  const logs = logsQuery.data ?? [];
  const status = health?.self_healing_active ? health.status : "recovering";
  const statusStyle = resolveStatusColor(status as SystemHealthStatus["status"] | "recovering");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let active = true;

    const logMetrics = async () => {
      try {
        const metrics: SystemMetrics = await fetchSystemMetrics();
        if (!active) {
          return;
        }
        console.info("[system-health]", metrics);
      } catch (error) {
        if (!active) {
          return;
        }
        console.warn("[system-health] Unable to fetch metrics", error);
      }
    };

    const interval = window.setInterval(logMetrics, 24 * 60 * 60 * 1000);
    void logMetrics();

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-6 text-slate-100"
    >
      <NextEventWidget />

      <motion.section
        layout
        className="overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-950 via-slate-900/95 to-blue-950 shadow-2xl"
      >
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-300">Overview</p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Dein Tages-Cockpit</h1>
            <p className="text-sm text-slate-300">
              Behalte anstehende Sessions, Systemgesundheit und Aktivitätslogs im Blick. Alles weitere findest du im Kalender.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="bg-slate-900/70 text-slate-100 hover:bg-slate-800"
              onClick={() => navigate("/dashboard/calendar")}
            >
              <CalendarDays className="mr-2 h-4 w-4" aria-hidden /> Kalender öffnen
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => navigate("/dashboard/templates")}
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden /> Templates ansehen
            </Button>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-200">
                <Clock3 className="h-5 w-5 text-blue-400" aria-hidden />
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">Nächste Termine</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs text-slate-300 hover:text-white"
                onClick={() => eventsQuery.refetch()}
                disabled={eventsQuery.isFetching}
              >
                <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${eventsQuery.isFetching ? "animate-spin" : ""}`} aria-hidden />
                Aktualisieren
              </Button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-700/70 p-4 text-sm text-slate-300">
                Keine bevorstehenden Termine. Plane direkt im Kalender oder nutze ein Template für deinen nächsten Fokusblock.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {upcomingEvents.map((event, index) => {
                  const formatted = formatRange(event.start, event.end);
                  return (
                    <li
                      key={`${event.title}-${event.start.getTime()}-${index}`}
                      className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4"
                    >
                      <p className="text-base font-semibold text-white">{event.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{formatted}</p>
                      {event.description ? (
                        <p className="mt-2 text-xs text-slate-400 overflow-hidden text-ellipsis">{event.description}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-slate-200">
              <Activity className="h-5 w-5 text-emerald-400" aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">Letzte Aktivität</span>
            </div>
            {logs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-300">Keine aktuellen Logs. Alles ruhig.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {logs.map((entry, index) => {
                  const { time, message } = formatLog(entry);
                  return (
                    <li
                      key={`${entry.id ?? index}-${time}`}
                      className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4"
                    >
                      <p className="text-sm font-medium text-slate-200">{message}</p>
                      <p className="mt-1 text-xs text-slate-400">{time}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-slate-200">
              {status === "ok" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
              ) : status === "error" ? (
                <AlertTriangle className="h-5 w-5 text-rose-400" aria-hidden />
              ) : (
                <Sparkles className="h-5 w-5 text-amber-300" aria-hidden />
              )}
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">System Health</span>
            </div>
            <div className={`mt-3 rounded-2xl border p-4 text-sm ${statusStyle}`}>
              <p className="text-base font-semibold">
                {status === "ok" ? "Alles stabil" : status === "error" ? "Erhöhte Aufmerksamkeit" : "Selbstheilung aktiv"}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {health?.status_message ?? "Monitoring aktiv. Du erhältst eine Meldung, falls Eingreifen erforderlich ist."}
              </p>
              {health?.checks?.length ? (
                <ul className="mt-3 space-y-2 text-xs text-slate-200/90">
                  {health.checks.slice(0, 4).map((check) => (
                    <li key={check.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
                      <span>{check.name}: {check.status}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Card>

          <Card className="border border-slate-700/70 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-slate-200">
              <FileText className="h-5 w-5 text-blue-400" aria-hidden />
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">Quick Actions</span>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>Kurzbefehle für häufige Schritte:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
                  onClick={() => navigate("/dashboard/tasks")}
                >
                  Aufgaben checken
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
                  onClick={() => navigate("/dashboard/xp")}
                >
                  XP & Level
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
                  onClick={() => navigate("/dashboard/ai")}
                >
                  AI Insights
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
                  onClick={() => navigate("/dashboard/templates")}
                >
                  Templates
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
