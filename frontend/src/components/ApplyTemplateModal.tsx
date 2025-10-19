import { FormEvent, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const inputClass = "border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500";

interface ApplyTemplateModalProps {
  open: boolean;
  templateName: string;
  isApplying: boolean;
  errorMessage?: string | null;
  onConfirm: (date: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function ApplyTemplateModal({
  open,
  templateName,
  isApplying,
  errorMessage,
  onConfirm,
  onOpenChange,
}: ApplyTemplateModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedDate("");
      setLocalError(null);
    }
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDate) {
      setLocalError("Choose a date to apply this template.");
      return;
    }
    setLocalError(null);
    onConfirm(selectedDate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent backgroundColor="#0f172a" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-slate-100">Apply "{templateName}"</DialogTitle>
          <DialogDescription className="text-slate-300">
            Select a day to schedule the template. Existing events will be respected automatically.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-slate-200" htmlFor="apply-template-date">Date</Label>
            <Input
              id="apply-template-date"
              type="date"
              className={inputClass}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
          {localError ? <p className="text-sm text-rose-300">{localError}</p> : null}
          {!localError && errorMessage ? (
            <p className="text-sm text-rose-300">{errorMessage}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="border border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isApplying} className="bg-brand-primary text-slate-50 hover:bg-brand-primary/90">
              {isApplying ? "Applying…" : "Apply template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
