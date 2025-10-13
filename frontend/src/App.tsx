import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CalendarEvent,
  CreateEventPayload,
  EventCategory,
  FeedbackPayload,
  UpdateEventPayload,
  completeEvent,
  createEvent,
  deleteEvent,
  fetchEventCategories,
  fetchEvents,
  fetchFeedbackSummary,
  fetchXpTotals,
  submitFeedback,
  updateEvent
} from "./api/client";
import { CalendarView } from "./components/CalendarView";
import { StatsDashboard } from "./components/StatsDashboard";
import { FeedbackDialog } from "./components/FeedbackDialog";
import { TopBar } from "./components/TopBar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";

import "./index.css";

const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

type EventFormState = {
  title: string;
  description: string;
  category: string;
  start: string;
  end: string;
};

function createDefaultFormState(category: string): EventFormState {
  return {
    title: "",
    description: "",
    category,
    start: "",
    end: ""
  };
}

const FALLBACK_CATEGORIES: EventCategory[] = [
  { slug: "work", name: "Work", xp_value: 50 },
  { slug: "personal", name: "Personal", xp_value: 30 },
  { slug: "health", name: "Health", xp_value: 40 },
  { slug: "other", name: "Other", xp_value: 20 },
  { slug: "general", name: "General", xp_value: 20 },
];

function formatDateInput(date: Date | null) {
  if (!date) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localISO = new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  return localISO;
}

function normalizePayloadDate(value: string) {
  if (!value) {
    return value;
  }
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, "");
}

export default function App() {
  const queryClient = useQueryClient();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [formState, setFormState] = useState<EventFormState>(() => createDefaultFormState("work"));
  const [selectedRange, setSelectedRange] = useState<{ start: Date; end: Date } | null>(null);
  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  const [feedbackEvent, setFeedbackEvent] = useState<CalendarEvent | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  useEffect(() => {
    if (!xpAwarded) return;
    const timeout = setTimeout(() => setXpAwarded(null), 4000);
    return () => clearTimeout(timeout);
  }, [xpAwarded]);

  const categoriesQuery = useQuery({ queryKey: ["event-categories"], queryFn: fetchEventCategories });
  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const xpQuery = useQuery({ queryKey: ["xp"], queryFn: fetchXpTotals });
  const feedbackSummaryQuery = useQuery({ queryKey: ["feedback-summary"], queryFn: fetchFeedbackSummary });

  const apiCategories = categoriesQuery.data ?? null;
  const categories = apiCategories && apiCategories.length > 0 ? apiCategories : FALLBACK_CATEGORIES;
  const events = eventsQuery.data ?? [];
  const xpTotals = xpQuery.data;
  const feedbackSummary = feedbackSummaryQuery.data;

  const fallbackCategory = useMemo(() => {
    if (categories.some((category) => category.slug === "work")) {
      return "work";
    }
    if (categories.some((category) => category.slug === "personal")) {
      return "personal";
    }
    return categories[0]?.slug ?? "work";
  }, [categories]);

  const activeEvent = useMemo(() => {
    if (!activeEventId) {
      return null;
    }
    return events.find((event) => event.id === activeEventId) ?? null;
  }, [activeEventId, events]);

  useEffect(() => {
    if (!selectedRange || activeEventId) {
      return;
    }
    setFormState((prev) => ({
      ...prev,
      start: formatDateInput(selectedRange.start),
      end: formatDateInput(selectedRange.end)
    }));
  }, [selectedRange, activeEventId]);

  useEffect(() => {
    if (activeEvent || !categories.length) {
      return;
    }
    if (!categories.some((category) => category.slug === formState.category)) {
      setFormState((prev) => ({ ...prev, category: fallbackCategory }));
    }
  }, [categories, formState.category, fallbackCategory, activeEvent]);

  useEffect(() => {
    if (!activeEvent) {
      return;
    }
    setFormState({
      title: activeEvent.title,
      description: activeEvent.description ?? "",
      category: activeEvent.category,
      start: formatDateInput(new Date(activeEvent.start)),
      end: formatDateInput(new Date(activeEvent.end))
    });
  }, [activeEvent]);

  const closeEventDialog = () => {
    setEventDialogOpen(false);
    setActiveEventId(null);
    setSelectedRange(null);
    setFormState(createDefaultFormState(fallbackCategory));
  };

  const handleDialogOpenChange = (open: boolean) => {
    setEventDialogOpen(open);
    if (!open) {
      setActiveEventId(null);
      setSelectedRange(null);
      setFormState(createDefaultFormState(fallbackCategory));
    }
  };

  const createEventMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      closeEventDialog();
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ eventId, payload }: { eventId: number; payload: UpdateEventPayload }) =>
      updateEvent(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["xp"] });
      closeEventDialog();
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["xp"] });
      closeEventDialog();
    }
  });

  const completeEventMutation = useMutation({
    mutationFn: (eventId: number) => completeEvent(eventId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["xp"] });
      setFeedbackEvent(data.event);
      setXpAwarded(data.xp_awarded);
      setFeedbackDialogOpen(true);
      closeEventDialog();
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: (payload: FeedbackPayload) => submitFeedback(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-summary"] });
      setFeedbackDialogOpen(false);
    }
  });

  const handleAddEvent = () => {
    setActiveEventId(null);
    setSelectedRange(null);
    const now = new Date();
    setFormState({
      ...createDefaultFormState(fallbackCategory),
      start: formatDateInput(now),
      end: formatDateInput(new Date(now.getTime() + DEFAULT_EVENT_DURATION_MS))
    });
    setEventDialogOpen(true);
  };

  const handleSubmitEvent = () => {
    if (!formState.title || !formState.start || !formState.end) {
      return;
    }

    const payload: CreateEventPayload = {
      title: formState.title,
      description: formState.description,
      category: formState.category,
      start: normalizePayloadDate(formState.start),
      end: normalizePayloadDate(formState.end)
    };

    if (activeEventId) {
      updateEventMutation.mutate({ eventId: activeEventId, payload: payload as UpdateEventPayload });
    } else {
      createEventMutation.mutate(payload);
    }
  };

  const handleEventClick = (eventId: number) => {
    const event = events.find((item) => item.id === eventId);
    if (!event) {
      return;
    }
    setActiveEventId(eventId);
    setSelectedRange(null);
    setFormState({
      title: event.title,
      description: event.description ?? "",
      category: event.category,
      start: formatDateInput(new Date(event.start)),
      end: formatDateInput(new Date(event.end))
    });
    setEventDialogOpen(true);
  };

  const handleCompleteActiveEvent = () => {
    if (!activeEventId) {
      return;
    }
    completeEventMutation.mutate(activeEventId);
  };

  const handleDeleteEvent = () => {
    if (!activeEventId) {
      return;
    }
    deleteEventMutation.mutate(activeEventId);
  };

  const handleFeedbackSubmit = async (payload: { rating: number; mood: string; notes?: string }) => {
    if (!feedbackEvent) return;
    await feedbackMutation.mutateAsync({ ...payload, event_id: feedbackEvent.id });
  };

  useEffect(() => {
    if (!feedbackDialogOpen) {
      setFeedbackEvent(null);
    }
  }, [feedbackDialogOpen]);

  const isEditing = Boolean(activeEventId);
  const isSaving = createEventMutation.isPending || updateEventMutation.isPending;

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <TopBar totalXp={xpTotals?.total ?? 0} onAddEvent={handleAddEvent} />
        {xpAwarded ? (
          <div className="rounded-md bg-white p-3 text-sm text-emerald-600 shadow-sm">
            +{xpAwarded} XP awarded!
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <CalendarView
            events={events}
            onSelectRange={(range) => {
              setActiveEventId(null);
              setSelectedRange(range);
              setFormState({
                ...createDefaultFormState(fallbackCategory),
                start: formatDateInput(range.start),
                end: formatDateInput(range.end)
              });
              setEventDialogOpen(true);
            }}
            onEventClick={handleEventClick}
          />
          <StatsDashboard
            xpTotals={xpTotals}
            feedbackSummary={feedbackSummary}
            categories={categories}
          />
        </div>
      </div>

      <Dialog open={eventDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit event" : "Schedule event"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update, complete, or delete this calendar event." : "Create a new calendar event."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={formState.start}
                  onChange={(event) => setFormState((prev) => ({ ...prev, start: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={formState.end}
                  onChange={(event) => setFormState((prev) => ({ ...prev, end: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-category">Category</Label>
                <select
                  id="event-category"
                  className="h-10 w-full rounded-md border border-muted bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                  value={formState.category}
                  onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                >
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            {isEditing ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={handleDeleteEvent}
                  disabled={deleteEventMutation.isPending}
                  className="sm:w-auto"
                >
                  Delete event
                </Button>
                {activeEvent?.completed ? (
                  <Button variant="secondary" disabled className="sm:w-auto">
                    Completed
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleCompleteActiveEvent}
                    disabled={completeEventMutation.isPending}
                    className="sm:w-auto"
                  >
                    Mark complete
                  </Button>
                )}
                <Button onClick={handleSubmitEvent} disabled={isSaving} className="sm:w-auto">
                  Save changes
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleSubmitEvent} disabled={isSaving}>
                Add event
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        onSubmit={handleFeedbackSubmit}
        eventTitle={feedbackEvent?.title}
      />
    </div>
  );
}
