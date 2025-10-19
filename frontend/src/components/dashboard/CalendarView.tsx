import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, Clock3, Loader2, Plus, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type {
  CalendarEvent,
  EventCategory,
  SystemLogEntry,
  SystemHealthStatus,
} from "../../api/client";
import {
  createEvent,
  fetchEventCategories,
  fetchEvents,
  fetchSystemHealth,
  fetchSystemLogs,
  submitFeedback,
  type FeedbackPayload,
} from "../../api/client";
import { AVATAR_QUERY_KEY } from "../../lib/useAvatar";
import { CalendarView as SchedulerCalendar } from "../CalendarView";
import { FeedbackModal } from "../Feedback/FeedbackModal";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface SelectedDetails {
  event?: CalendarEvent;
  range?: { start: Date; end: Date };
}

interface NewEventFormState {
  title: string;
  start: string;
  end: string;
  category: string;
  description: string;
}

type FeedbackFormPayload = Omit<FeedbackPayload, "event_id">;

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
  ok: "bg-emerald-500/20 text-emerald-200",
  error: "bg-rose-500/20 text-rose-200",
  recovering: "bg-amber-500/20 text-amber-200",
};

const DEFAULT_EVENT_CATEGORY = "work";

const toDateTimeLocalValue = (date: Date) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return copy.toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export default function CalendarView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [details, setDetails] = useState<SelectedDetails | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<CalendarEvent | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<NewEventFormState>(() => {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      title: "",
      start: toDateTimeLocalValue(now),
      end: toDateTimeLocalValue(inOneHour),
      category: DEFAULT_EVENT_CATEGORY,
      description: "",
    };
  });

  const eventsQuery = useQuery({
    queryKey: ["events", "dashboard"],
    queryFn: fetchEvents,
    refetchInterval: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["event-categories"],
    queryFn: fetchEventCategories,
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

  const categories = categoriesQuery.data ?? [];

  useEffect(() => {
    if (createModalOpen && !createForm.category && categories.length > 0) {
      setCreateForm((previous) => ({ ...previous, category: categories[0].slug }));
    }
  }, [categories, createForm.category, createModalOpen]);

  const events = eventsQuery.data ?? [];
  const upcoming = useMemo(() => resolveNextEvent(events), [events]);

  const status = healthQuery.data?.self_healing_active
    ? healthQuery.data.status
    : "recovering";
  const statusBadge = STATUS_BADGES[status as keyof typeof STATUS_BADGES] ?? "bg-blue-500/20 text-blue-200";

  const createEventMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      setCreateModalOpen(false);
      setCreateError(null);
      setCreateForm((previous) => ({
        ...previous,
        title: "",
        description: "",
      }));
      queryClient.invalidateQueries({ queryKey: ["events", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Das Event konnte nicht gespeichert werden. Bitte erneut versuchen.";
      setCreateError(message);
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ eventId, payload }: { eventId: number; payload: FeedbackFormPayload }) =>
      submitFeedback({ ...payload, event_id: eventId }),
    onMutate: () => {
      setFeedbackError(null);
    },
    onSuccess: () => {
      setFeedbackModalOpen(false);
      setFeedbackTarget(null);
      setFeedbackError(null);
      queryClient.invalidateQueries({ queryKey: ["feedback", "summary", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ai", "insights", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["xp", "summary", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["xp", "level-status", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["events", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: AVATAR_QUERY_KEY });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Feedback konnte nicht gespeichert werden. Bitte erneut versuchen.";
      setFeedbackError(message);
    },
  });

  const handleOpenCreateModal = (range?: { start: Date; end: Date }) => {
    const start = range?.start ?? new Date();
    const end = range?.end ?? new Date(start.getTime() + 60 * 60 * 1000);
    setCreateForm((previous) => ({
      ...previous,
      title: "",
      start: toDateTimeLocalValue(start),
      end: toDateTimeLocalValue(end),
      category: categories[0]?.slug ?? previous.category ?? DEFAULT_EVENT_CATEGORY,
      description: "",
    }));
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const handleSubmitNewEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = createForm.title.trim();
    const start = fromDateTimeLocalValue(createForm.start);
    const end = fromDateTimeLocalValue(createForm.end);
    const category = createForm.category || categories[0]?.slug || DEFAULT_EVENT_CATEGORY;
    const description = createForm.description.trim();

    if (!title) {
      setCreateError("Bitte einen Titel für den Termin vergeben.");
      return;
    }
    if (!start || !end || start >= end) {
      setCreateError("Bitte einen gültigen Zeitraum auswählen.");
      return;
    }

    createEventMutation.mutate({
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      category,
      description: description || undefined,
    });
  };

  const handleFeedbackSubmit = async (payload: FeedbackFormPayload) => {
    if (!feedbackTarget) {
      return;
    }
    try {
      await feedbackMutation.mutateAsync({ eventId: feedbackTarget.id, payload });
    } catch {
      /* Mutation error handled via onError */
    }
  };

  const openFeedbackForEvent = (event: CalendarEvent) => {
    setFeedbackTarget(event);
    setFeedbackError(null);
    setFeedbackModalOpen(true);
  };

  const calendarSection = (
    <motion.section
      layout
      className="flex min-h-[560px] flex-col rounded-3xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-2xl backdrop-blur"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <CalendarDays className="h-5 w-5 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">Kalender</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => eventsQuery.refetch()}
            disabled={eventsQuery.isFetching}
            className="bg-slate-800 text-slate-100 hover:bg-slate-700"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${eventsQuery.isFetching ? "animate-spin" : ""}`} /> Aktualisieren
          </Button>
          <Button onClick={() => handleOpenCreateModal()} className="bg-blue-600 text-white hover:bg-blue-500">
            <Plus className="mr-2 h-4 w-4" /> Event anlegen
          </Button>
        </div>
      </div>

      {eventsQuery.isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          Events werden geladen…
        </div>
      ) : (
        <SchedulerCalendar
          events={events}
          onSelectRange={(range) => {
            const selection = {
              start: new Date(range.start.getTime()),
              end: new Date(range.end.getTime()),
            };
            setDetails({ range: selection });
            handleOpenCreateModal(selection);
          }}
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
  );

  const asideSection = (
    <motion.aside
      layout
      className="space-y-4 rounded-3xl border border-slate-700/70 bg-slate-900/80 p-6 shadow-2xl backdrop-blur"
    >
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Nächster Termin</h4>
        {upcoming ? (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm shadow-inner">
            <p className="text-lg font-semibold text-blue-200">{upcoming.title}</p>
            <p className="mt-1 text-slate-200">{formatDateRange(upcoming)}</p>
            {upcoming.description ? (
              <p className="mt-2 text-sm text-slate-300">{upcoming.description}</p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-600 p-4 text-sm text-slate-300">
            Keine kommenden Termine – nutze Templates oder lege neue Events direkt im Kalender an.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">System Health</h4>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusBadge}`}>
            {status === "ok" ? "Stable" : status === "error" ? "Error" : "Recovering"}
          </span>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>Self-Healing aktiv: {healthQuery.data?.self_healing_active ? "Ja" : "Nein"}</li>
          <li>Letzte Aktion: {healthQuery.data?.last_recovery_action ?? "–"}</li>
          <li>Logs verfügbar: {healthQuery.data?.system_log_entries ?? 0}</li>
          <li>
            Zuletzt geprüft:{" "}
            {healthQuery.data?.last_recovery_run
              ? new Date(healthQuery.data.last_recovery_run).toLocaleString("de-CH")
              : "–"}
          </li>
        </ul>
        <Button
          variant="secondary"
          onClick={() => setLogsOpen(true)}
          className="w-full bg-slate-800 text-slate-100 hover:bg-slate-700"
        >
          Logs ansehen
        </Button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Ausgewählter Bereich</h4>
        {details?.range ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-sm shadow-inner">
            <p className="font-semibold text-white">{formatRange(details.range)}</p>
            <p className="mt-2 text-slate-300">
              Öffne Templates, um Zeitblöcke zu füllen, oder lege ein neues Event direkt im Kalender an.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate("/dashboard/templates")}>
                Templates öffnen
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-slate-800 text-slate-100 hover:bg-slate-700"
                onClick={() => setDetails(null)}
              >
                Auswahl zurücksetzen
              </Button>
            </div>
          </div>
        ) : details?.event ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-sm shadow-inner">
            <p className="text-lg font-semibold text-white">{details.event.title}</p>
            <p className="mt-1 text-slate-300">{formatDateRange(details.event)}</p>
            {details.event.description ? (
              <p className="mt-2 text-slate-300">{details.event.description}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (details?.event) {
                    openFeedbackForEvent(details.event);
                  }
                }}
              >
                Feedback öffnen
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="bg-slate-800 text-slate-100 hover:bg-slate-700"
                onClick={() => setDetails(null)}
              >
                Schließen
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-600 p-4 text-sm text-slate-300">
            Wähle ein Event oder Zeitfenster im Kalender aus, um Details und Aktionen hier zu sehen.
          </p>
        )}
      </div>
    </motion.aside>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 text-slate-100"
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col gap-4 rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-6 shadow-2xl"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">System Insights</p>
            <h2 className="text-3xl font-bold text-white">Unified Calendar Overview</h2>
            <p className="text-sm text-slate-300">
              Plane Events, prüfe Self-Healing-Status und halte Templates griffbereit – alles ohne die Seite zu verlassen.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              className="bg-slate-800 text-slate-100 hover:bg-slate-700"
              onClick={() => navigate("/dashboard/templates")}
            >
              Template-Manager
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        {calendarSection}
        {asideSection}
      </div>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-white">
              <Plus className="h-5 w-5 text-blue-400" />
              Neues Event anlegen
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-300">
              Definiere Titel, Zeitraum und Kategorie für deinen neuen Termin.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitNewEvent}>
            <div className="space-y-2">
              <Label htmlFor="event-title" className="text-slate-200">
                Titel
              </Label>
              <Input
                id="event-title"
                value={createForm.title}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="Weekly Sync"
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start" className="text-slate-200">
                  Start
                </Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={createForm.start}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, start: event.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end" className="text-slate-200">
                  Ende
                </Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={createForm.end}
                  onChange={(event) => setCreateForm((previous) => ({ ...previous, end: event.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-100"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-category" className="text-slate-200">
                Kategorie
              </Label>
              <select
                id="event-category"
                value={createForm.category}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, category: event.target.value }))}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((category: EventCategory) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
                {!categories.length ? (
                  <option value={DEFAULT_EVENT_CATEGORY}>Work (Standard)</option>
                ) : null}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description" className="text-slate-200">
                Beschreibung
              </Label>
              <Textarea
                id="event-description"
                value={createForm.description}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))}
                rows={4}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            {createError ? <p className="text-sm text-rose-300">{createError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="bg-slate-800 text-slate-100 hover:bg-slate-700"
                onClick={() => setCreateModalOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-500" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Speichere…" : "Event speichern"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(details?.event)} onOpenChange={(open) => (!open ? setDetails(null) : null)}>
        <DialogContent className="sm:max-w-lg border border-slate-700 bg-slate-900 text-slate-100">
          {details?.event ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl text-white">
                  <Clock3 className="h-5 w-5 text-blue-400" />
                  {details.event.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-300">
                  {formatDateRange(details.event)}
                </DialogDescription>
              </DialogHeader>
              {details.event.description ? (
                <p className="py-4 text-sm text-slate-200">{details.event.description}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  className="bg-slate-800 text-slate-100 hover:bg-slate-700"
                  onClick={() => setDetails(null)}
                >
                  Schließen
                </Button>
                <Button
                  onClick={() => {
                    if (details?.event) {
                      openFeedbackForEvent(details.event);
                      setDetails(null);
                    }
                  }}
                >
                  Feedback öffnen
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl border border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">System-Logs</DialogTitle>
            <DialogDescription className="text-sm text-slate-300">
              Self-Healing Aktionen und Systemmeldungen der letzten Stunden.
            </DialogDescription>
          </DialogHeader>
          {logsQuery.isLoading ? (
            <p className="text-sm text-slate-300">Logs werden geladen…</p>
          ) : logsQuery.isError ? (
            <p className="text-sm text-rose-300">Logs konnten nicht geladen werden.</p>
          ) : logsQuery.data?.length ? (
            <ul className="space-y-3">
              {logsQuery.data.map((log) => (
                <li
                  key={log.id}
                  className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-white">
                      {new Date(log.timestamp).toLocaleString("de-CH")}
                    </span>
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-200">
                      {log.severity ?? "info"}
                    </span>
                  </div>
                  {log.component ? (
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{log.component}</p>
                  ) : null}
                  {log.message ? (
                    <p className="mt-2 text-slate-200">{log.message}</p>
                  ) : null}
                  {log.action_taken ? (
                    <p className="mt-2 text-sm text-blue-300">Aktion: {log.action_taken}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-400">
                    Status: {log.resolved ? "✅ Behoben" : "⏳ Offen"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-300">Keine Log-Einträge vorhanden.</p>
          )}
        </DialogContent>
      </Dialog>
      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={(open) => {
          setFeedbackModalOpen(open);
          if (!open) {
            setFeedbackTarget(null);
            setFeedbackError(null);
          }
        }}
        onSubmit={handleFeedbackSubmit}
        eventTitle={feedbackTarget?.title}
        errorMessage={feedbackError}
      />
    </motion.div>
  );
}
