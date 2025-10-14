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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply "{templateName}"</DialogTitle>
          <DialogDescription>
            Select a day to schedule the template. Existing events will be respected automatically.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="apply-template-date">Date</Label>
            <Input
              id="apply-template-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
          {localError ? <p className="text-sm text-red-600">{localError}</p> : null}
          {!localError && errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
              Cancel
            </Button>
            <Button type="submit" disabled={isApplying}>
              {isApplying ? "Applying…" : "Apply template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
