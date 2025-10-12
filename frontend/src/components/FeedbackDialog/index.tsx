import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const moods = ["energized", "focused", "neutral", "tired"];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { rating: number; mood: string; notes?: string }) => Promise<void>;
  eventTitle?: string;
}

export function FeedbackDialog({ open, onOpenChange, onSubmit, eventTitle }: FeedbackDialogProps) {
  const [rating, setRating] = useState(3);
  const [mood, setMood] = useState("energized");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setRating(3);
      setMood("energized");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({ rating, mood, notes: notes || undefined });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How did "{eventTitle ?? "this event"}" go?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-sm font-medium">Difficulty</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={rating === value ? "default" : "secondary"}
                  className={cn("h-10 w-10 rounded-full", rating === value && "ring-2 ring-offset-2")}
                  onClick={() => setRating(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Mood</span>
            <div className="flex flex-wrap gap-2">
              {moods.map((item) => (
                <Button
                  key={item}
                  variant={mood === item ? "default" : "secondary"}
                  onClick={() => setMood(item)}
                  className="capitalize"
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="feedback-notes">
              Notes (optional)
            </label>
            <textarea
              id="feedback-notes"
              className="h-24 w-full rounded-md border border-muted bg-white p-2 text-sm focus-visible:outline-none focus-visible:ring-2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            Submit feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
