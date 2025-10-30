
import { FormEvent, useEffect, useMemo, useState } from "react";

import type { TemplateApplyOptions } from "../api/client";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const inputClass = "border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500";

const WEEKDAY_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "Mo", value: 0 },
  { label: "Di", value: 1 },
  { label: "Mi", value: 2 },
  { label: "Do", value: 3 },
  { label: "Fr", value: 4 },
  { label: "Sa", value: 5 },
  { label: "So", value: 6 },
];

interface ApplyTemplateModalProps {
  open: boolean;
  templateName: string;
  isApplying: boolean;
  errorMessage?: string | null;
  onConfirm: (options: TemplateApplyOptions) => void;
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
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [durationWeeks, setDurationWeeks] = useState<number>(1);
  const [includeStartDate, setIncludeStartDate] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedDate("");
      setSelectedDays([]);
      setDurationWeeks(1);
      setIncludeStartDate(true);
      setLocalError(null);
    }
  }, [open]);

  const sortedDays = useMemo(() => selectedDays.slice().sort((a, b) => a - b), [selectedDays]);

  const handleToggleDay = (day: number) => {
    setSelectedDays((previous) =>
      previous.includes(day) ? previous.filter((value) => value !== day) : [...previous, day]
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDate) {
      setLocalError("Wähle ein Startdatum aus.");
      return;
    }
    setLocalError(null);
    onConfirm({
      start_date: selectedDate,
      days_of_week: sortedDays,
      duration_weeks: durationWeeks,
      include_start_date: includeStartDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent backgroundColor="#0f172a" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-slate-100">Template anwenden</DialogTitle>
          <DialogDescription className="text-slate-300">
            Wähle ein Startdatum und optional Wochentage sowie Dauer, damit "{templateName}" automatisch geplant wird.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-slate-200" htmlFor="apply-template-date">Startdatum</Label>
            <Input
              id="apply-template-date"
              type="date"
              className={inputClass}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Wochentage</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((day) => {
                const isActive = selectedDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleToggleDay(day.value)}
                    className={`min-w-[3rem] rounded-full border px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive
                        ? "border-blue-400 bg-blue-500/20 text-blue-100"
                        : "border-slate-600 bg-slate-900 text-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">
              Markiere zusätzliche Wochentage, an denen das Template wiederholt werden soll.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-200" htmlFor="template-duration">Dauer (Wochen)</Label>
              <select
                id="template-duration"
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={durationWeeks}
                onChange={(event) => setDurationWeeks(Number.parseInt(event.target.value, 10))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200" htmlFor="template-include-start">Starttag einbeziehen</Label>
              <div className="flex items-center gap-2">
                <input
                  id="template-include-start"
                  type="checkbox"
                  className="h-4 w-4 accent-blue-500"
                  checked={includeStartDate}
                  onChange={(event) => setIncludeStartDate(event.target.checked)}
                />
                <span className="text-sm text-slate-300">Template auch am Startdatum anwenden</span>
              </div>
            </div>
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
              Abbrechen
            </Button>
            <Button type="submit" disabled={isApplying} className="bg-brand-primary text-slate-50 hover:bg-brand-primary/90">
              {isApplying ? "Übernehme…" : "Template anwenden"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
