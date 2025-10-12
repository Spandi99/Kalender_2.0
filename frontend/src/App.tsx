import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CalendarEvent,
  CreateEventPayload,
  FeedbackPayload,
  createEvent,
  fetchEvents,
  fetchFeedbackSummary,
  fetchXpTotals,
  completeEvent,
  submitFeedback
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

const categories = [
  { label: "Work", value: "work" },
  { label: "Personal", value: "personal" },
  { label: "Health", value: "health" },
  { label: "Other", value: "other" }
];

const defaultFormState = {
  title: "",
  description: "",
  category: "work",
  start_time: "",
  end_time: ""
};

function formatDateInput(date: Date | null) {
  if (!date) return "";
  const iso = date.toISOString();
  return iso.slice(0, 16);
}

export default function App() {
  const queryClient = useQueryClient();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [formState, setFormState] = useState(defaultFormState);
  const [selectedRange, setSelectedRange] = useState<{ start: Date; end: Date } | null>(null);
  const [feedbackEvent, setFeedbackEvent] = useState<CalendarEvent | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  useEffect(() => {
    if (!xpAwarded) return;
    const timeout = setTimeout(() => setXpAwarded(null), 4000);
    return () => clearTimeout(timeout);
  }, [xpAwarded]);

  const eventsQuery = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const xpQuery = useQuery({ queryKey: ["xp"], queryFn: fetchXpTotals });
  const feedbackSummaryQuery = useQuery({ queryKey: ["feedback-summary"], queryFn: fetchFeedbackSummary });

  useEffect(() => {
    if (selectedRange) {
      setFormState((prev) => ({
        ...prev,
        start_time: formatDateInput(selectedRange.start),
        end_time: formatDateInput(selectedRange.end)
      }));
    }
  }, [selectedRange]);

  const createEventMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setEventDialogOpen(false);
      setFormState(defaultFormState);
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
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: (payload: FeedbackPayload) => submitFeedback(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-summary"] });
      setFeedbackDialogOpen(false);
    }
  });

  const events = eventsQuery.data ?? [];
  const xpTotals = xpQuery.data;
  const feedbackSummary = feedbackSummaryQuery.data;

  const handleAddEvent = () => {
    setSelectedRange(null);
    const now = new Date();
    setFormState({
      title: "",
      description: "",
      category: "work",
      start_time: formatDateInput(now),
      end_time: formatDateInput(new Date(now.getTime() + 60 * 60 * 1000))
    });
    setEventDialogOpen(true);
  };

  const handleSubmitEvent = () => {
    if (!formState.title || !formState.start_time || !formState.end_time) {
      return;
    }

    createEventMutation.mutate({
      title: formState.title,
      description: formState.description,
      category: formState.category,
      start_time: new Date(formState.start_time).toISOString(),
      end_time: new Date(formState.end_time).toISOString()
    });
  };

  const handleCompleteEvent = (eventId: number) => {
    completeEventMutation.mutate(eventId);
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
              setSelectedRange(range);
              setEventDialogOpen(true);
            }}
            onEventClick={handleCompleteEvent}
          />
          <StatsDashboard xpTotals={xpTotals} feedbackSummary={feedbackSummary} />
        </div>
      </div>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule event</DialogTitle>
            <DialogDescription>Create a new calendar event.</DialogDescription>
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
                  value={formState.start_time}
                  onChange={(event) => setFormState((prev) => ({ ...prev, start_time: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={formState.end_time}
                  onChange={(event) => setFormState((prev) => ({ ...prev, end_time: event.target.value }))}
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
                    <option key={category.value} value={category.value}>
                      {category.label}
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
            <Button className="w-full" onClick={handleSubmitEvent} disabled={createEventMutation.isPending}>
              Add event
            </Button>
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
