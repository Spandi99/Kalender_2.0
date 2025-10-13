import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { cn } from "../../lib/utils";

const MOODS = [
  { value: "😊", label: "Feeling great" },
  { value: "😐", label: "It was okay" },
  { value: "😞", label: "Challenging" },
];

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { rating: number; mood: string; notes?: string }) => Promise<void>;
  eventTitle?: string;
}

export function FeedbackModal({ open, onOpenChange, onSubmit, eventTitle }: FeedbackModalProps) {
  const [rating, setRating] = useState(4);
  const [mood, setMood] = useState(MOODS[0]?.value ?? "😊");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setRating(4);
      setMood(MOODS[0]?.value ?? "😊");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ rating, mood, notes: notes.trim() ? notes.trim() : undefined });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share feedback for {eventTitle ?? "this event"}</DialogTitle>
          <DialogDescription>
            Your reflections help the planner learn what energises you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <span className="text-sm font-medium">How did it feel?</span>
            <div className="flex items-center gap-2">
              {MOODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMood(item.value)}
                  className={cn(
                    "flex h-12 w-full flex-1 flex-col items-center justify-center rounded-md border text-lg transition",
                    mood === item.value
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                      : "border-muted bg-white text-muted-foreground hover:border-indigo-200"
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
                    "flex h-10 w-10 items-center justify-center rounded-full border text-lg transition",
                    value <= rating
                      ? "border-amber-500 bg-amber-50 text-amber-500"
                      : "border-muted bg-white text-muted-foreground hover:border-amber-200"
                  )}
                  aria-label={`Rate ${value} out of 5`}
                >
                  {value <= rating ? "★" : "☆"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="feedback-notes">
              Notes (optional)
            </label>
            <Textarea
              id="feedback-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What went well? What could improve?"
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
