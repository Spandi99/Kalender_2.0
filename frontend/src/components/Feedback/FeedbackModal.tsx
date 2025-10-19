import { useEffect, useState } from "react";

import type { FeedbackPayload } from "../../api/client";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

const MOODS = [
  { value: "😊", label: "Feeling great" },
  { value: "😐", label: "It was okay" },
  { value: "😞", label: "Challenging" },
];

const REASONS = [
  { value: "too_tired", label: "Too tired" },
  { value: "no_time", label: "No time" },
  { value: "forgot", label: "Forgot" },
  { value: "low_motivation", label: "Low motivation" },
  { value: "other", label: "Other" },
];

const PUNCTUALITY_OPTIONS = [
  { value: "on_time", label: "On time" },
  { value: "late", label: "Late" },
  { value: "early", label: "Early" },
];

const TOGGLE_BASE_CLASS = "flex h-11 items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 text-sm font-medium text-slate-200 transition shadow-sm hover:bg-slate-900/70";
const TOGGLE_ACTIVE_CLASS = "border-brand-primary bg-brand-primary/20 text-brand-primary";
const MOOD_BUTTON_CLASS = "flex h-12 w-full flex-1 flex-col items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 text-lg text-slate-200 transition shadow-sm hover:bg-slate-900/70";
const MOOD_BUTTON_ACTIVE_CLASS = "border-brand-primary bg-brand-primary/20 text-brand-primary";
const RATING_BUTTON_CLASS = "flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-lg text-slate-200 transition hover:bg-slate-900/70";
const RATING_BUTTON_ACTIVE_CLASS = "border-amber-500 bg-amber-500/20 text-amber-200";
const INPUT_CLASS = "border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500";

type FeedbackFormPayload = Omit<FeedbackPayload, "event_id">;

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: FeedbackFormPayload) => Promise<void>;
  eventTitle?: string;
  errorMessage?: string | null;
}

export function FeedbackModal({ open, onOpenChange, onSubmit, eventTitle, errorMessage }: FeedbackModalProps) {
  const [completed, setCompleted] = useState(true);
  const [rating, setRating] = useState(4);
  const [mood, setMood] = useState(MOODS[0]?.value ?? "😊");
  const [reason, setReason] = useState<FeedbackFormPayload["reason"] | "">("");
  const [punctuality, setPunctuality] = useState<FeedbackFormPayload["punctuality"] | "">("");
  const [arrivalDelay, setArrivalDelay] = useState("");
  const [durationVariance, setDurationVariance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCompleted(true);
      setRating(4);
      setMood(MOODS[0]?.value ?? "😊");
      setReason("");
      setPunctuality("");
      setArrivalDelay("");
      setDurationVariance("");
      setNotes("");
      setFormError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setFormError(null);
    if (completed && punctuality === "late" && arrivalDelay.trim() === "") {
      setFormError("Bitte gib an, wie viele Minuten du zu spät warst.");
      return;
    }
    setIsSubmitting(true);
    try {
      const trimmedNotes = notes.trim();
      const parsedArrival = Number.parseInt(arrivalDelay, 10);
      const parsedVariance = Number.parseInt(durationVariance, 10);
      const arrivalDelayMinutes =
        punctuality === "late" && arrivalDelay.trim() !== "" && !Number.isNaN(parsedArrival)
          ? parsedArrival
          : null;
      const durationVarianceMinutes =
        durationVariance.trim() !== "" && !Number.isNaN(parsedVariance) ? parsedVariance : null;

      const payload: FeedbackFormPayload = {
        completed,
        rating: completed ? rating : null,
        mood: completed ? mood : null,
        reason: !completed ? (reason || null) : null,
        punctuality: completed ? (punctuality || null) : null,
        arrival_delay_minutes: completed ? arrivalDelayMinutes : null,
        duration_variance_minutes: completed ? durationVarianceMinutes : null,
        notes: trimmedNotes ? trimmedNotes : null,
      };

      await onSubmit(payload);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-slate-200" backgroundColor="#0f172a">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-slate-100">Share feedback for {eventTitle ?? "this event"}</DialogTitle>
          <DialogDescription className="text-slate-300">
            Your reflections help the planner learn what energises you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 shadow-inner">
          <div className="space-y-2">
            <span className="text-sm font-medium">Event completed?</span>
            <div className="grid grid-cols-2 gap-2">
              {["Yes", "No"].map((label) => {
                const value = label === "Yes";
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setCompleted(value)}
                    className={cn(
                      TOGGLE_BASE_CLASS,
                      completed === value ? TOGGLE_ACTIVE_CLASS : ""
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {!completed ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="feedback-reason">
                Why was it not completed?
              </label>
              <select
                id="feedback-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <option value="">Select a reason</option>
                {REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <span className="text-sm font-medium">How did it feel?</span>
                <div className="flex items-center gap-2">
                  {MOODS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setMood(item.value)}
                      className={cn(
                        MOOD_BUTTON_CLASS,
                        mood === item.value ? MOOD_BUTTON_ACTIVE_CLASS : ""
                      )}
                      aria-label={item.label}
                    >
                      <span className="text-2xl">{item.value}</span>
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Rate the session</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={cn(
                        RATING_BUTTON_CLASS,
                        value <= rating ? RATING_BUTTON_ACTIVE_CLASS : ""
                      )}
                      aria-label={`Rate ${value} out of 5`}
                    >
                      {value <= rating ? "★" : "☆"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Punctuality</span>
                <div className="flex items-center gap-2">
                  {PUNCTUALITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPunctuality(option.value)}
                      className={cn(
                        TOGGLE_BASE_CLASS,
                        punctuality === option.value ? "border-emerald-500 bg-emerald-500/15 text-emerald-200" : ""
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {punctuality === "late" && (
                  <div className="space-y-2">
                    <label
                      className="text-xs font-medium uppercase tracking-wide text-slate-400"
                      htmlFor="arrival-delay"
                    >
                      Minutes late
                    </label>
                    <Input
                      id="arrival-delay"
                      type="number"
                      className={INPUT_CLASS}
                      min={0}
                      value={arrivalDelay}
                      onChange={(event) => setArrivalDelay(event.target.value)}
                      placeholder="How many minutes late?"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="duration-variance">
                  Duration variance (minutes)
                </label>
                <Input
                  id="duration-variance"
                  type="number"
                  className={INPUT_CLASS}
                  value={durationVariance}
                  onChange={(event) => setDurationVariance(event.target.value)}
                  placeholder="Difference from planned duration"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="feedback-notes">
              Notes (optional)
            </label>
            <Textarea
              id="feedback-notes"
              className={INPUT_CLASS}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What went well? What could improve?"
            />
          </div>
          {formError ? (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200 shadow-inner">
              {formError}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-200 shadow-inner">
              {errorMessage}
            </div>
          ) : null}
          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
