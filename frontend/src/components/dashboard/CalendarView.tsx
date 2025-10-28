import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarDays, Clock3, Loader2, Plus, RefreshCcw } from "lucide-react";

import type { CalendarEvent, EventCategory } from "../../api/client";
import {
  createEvent,
  fetchEventCategories,
  fetchEvents,
  submitFeedback,
  type FeedbackPayload,
} from "../../api/client";
import { AVATAR_QUERY_KEY } from "../../lib/useAvatar";
import { syncEventNotifications } from "../../lib/notifications";
import { CalendarView as SchedulerCalendar } from "../CalendarView";
import { FeedbackModal } from "../Feedback/FeedbackModal";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface NewEventFormState {
  title: string;
  start: string;
  end: string;
  category: string;
  description: string;
}

type FeedbackFormPayload = Omit<FeedbackPayload, "event_id">;

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

function formatDateRange(event: CalendarEvent, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `${formatter.format(new Date(event.start))} – ${formatter.format(new Date(event.end))}`;
}

export default function CalendarView() {
  const queryClient = useQueryClient();
  const locale = typeof navigator !== "undefined" && navigator.language ? navigator.language : "de-CH";
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<CalendarEvent | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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

  const categories = categoriesQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  useEffect(() => {
    if (createModalOpen && !createForm.category && categories.length > 0) {
      setCreateForm((previous) => ({ ...previous, category: categories[0].slug }));
    }
  }, [categories, createForm.category, createModalOpen]);

  useEffect(() => {
    if (events.length === 0) {
      return;
    }
    void syncEventNotifications(events);
  }, [events]);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }
    const updated = events.find((event) => event.id === selectedEvent.id) ?? null;
    setSelectedEvent(updated);
  }, [events, selectedEvent?.id]);

  const upcomingStats = useMemo(() => {
    if (events.length === 0) {
      return null;
    }
    const sorted = [...events]
      .filter((event) => new Date(event.end).getTime() > Date.now())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const next = sorted[0];
    if (!next) {
      return null;
    }
    const startsInMinutes = Math.max(0, Math.round((new Date(next.start).getTime() - Date.now()) / 60_000));
    return {
      title: next.title,
      startsInMinutes,
    };
  }, [events]);

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
      /* handled */
    }
  };

  const handleEventClick = (eventId: number) => {
    const event = events.find((item) => item.id === eventId);
    if (event) {
      setSelectedEvent(event);
    }
  };

  const handleOpenFeedback = (event: CalendarEvent) => {
    setFeedbackTarget(event);
    setFeedbackError(null);
    setFeedbackModalOpen(true);
  };

  const upcomingLabel = useMemo(() => {
    if (!upcomingStats) {
      return "Alle Sessions im Blick";
    }
    if (upcomingStats.startsInMinutes < 1) {
      return `${upcomingStats.title} startet jetzt`;
    }
    if (upcomingStats.startsInMinutes < 60) {
      return `${upcomingStats.title} startet in ${upcomingStats.startsInMinutes} Min.`;
    }
    const hours = Math.floor(upcomingStats.startsInMinutes / 60);
    const minutes = upcomingStats.startsInMinutes % 60;
    const parts = [hours > 0 ? `${hours}h` : null, minutes > 0 ? `${minutes}m` : null].filter(Boolean).join(" ");
    return `${upcomingStats.title} in ${parts}`;
  }, [upcomingStats]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 text-slate-100"
    >
      <motion.section
        layout
        className="space-y-6 rounded-3xl border border-slate-700/70 bg-slate-900/85 p-6 shadow-2xl backdrop-blur"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-200">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              <span>Kalender</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Plane deinen Tag</h1>
            <p className="text-sm text-slate-300">
              Tippe auf Events, um Details zu öffnen, oder ziehe Zeitblöcke für neue Sessions. Die mobile Listenansicht passt sich automatisch an dein Gerät an.
            </p>
            <p className="text-xs text-blue-200/80">{upcomingLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="bg-slate-800 text-slate-100 hover:bg-slate-700"
              onClick={() => eventsQuery.refetch()}
              disabled={eventsQuery.isFetching}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${eventsQuery.isFetching ? "animate-spin" : ""}`} aria-hidden />
              Aktualisieren
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => handleOpenCreateModal()}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Event anlegen
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/80 p-3 shadow-inner">
          <div className="relative min-h-[520px] md:min-h-[680px]">
            {eventsQuery.isLoading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-slate-300">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" aria-hidden />
                Events werden geladen…
              </div>
            ) : (
              <div className="md:absolute md:inset-0">
                <SchedulerCalendar
                  events={events}
                  onSelectRange={(range) => {
                    const selection = {
                      start: new Date(range.start.getTime()),
                      end: new Date(range.end.getTime()),
                    };
                    handleOpenCreateModal(selection);
                  }}
                  onEventClick={handleEventClick}
                  timeZone="Europe/Zurich"
                  locale={locale}
                />
              </div>
            )}
          </div>
        </div>
      </motion.section>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl border border-slate-700 bg-slate-950/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-white">
              <Plus className="h-5 w-5 text-blue-400" aria-hidden />
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
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
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
                  className="border-slate-700 bg-slate-900 text-slate-100"
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
                  className="border-slate-700 bg-slate-900 text-slate-100"
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
                className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {categories.map((category: EventCategory) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
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
                placeholder="Kurze Agenda oder Notizen"
                className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                rows={4}
              />
            </div>
            {createError ? <p className="text-sm text-rose-300">{createError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-500" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Speichere…" : "Event speichern"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedEvent != null} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-md border border-slate-700 bg-slate-950/95">
          {selectedEvent ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-white">{selectedEvent.title}</DialogTitle>
                <DialogDescription className="text-sm text-slate-300">
                  {formatDateRange(selectedEvent, locale)}
                </DialogDescription>
              </DialogHeader>
              {selectedEvent.description ? (
                <p className="text-sm text-slate-200">{selectedEvent.description}</p>
              ) : (
                <p className="text-sm text-slate-400">Keine zusätzliche Beschreibung hinterlegt.</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => handleOpenFeedback(selectedEvent)}>
                  Feedback öffnen
                </Button>
                <Button type="button" variant="secondary" className="bg-slate-800 text-slate-100 hover:bg-slate-700" onClick={() => setSelectedEvent(null)}>
                  Schließen
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        onSubmit={handleFeedbackSubmit}
        eventTitle={feedbackTarget?.title}
        errorMessage={feedbackError}
      />
    </motion.div>
  );
}
