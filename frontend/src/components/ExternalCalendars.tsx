import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addICalCalendar, fetchImportedCalendars, syncICalCalendar } from "../api/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

interface FormState {
  name: string;
  url: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  url: "",
};

export function ExternalCalendars() {
  const queryClient = useQueryClient();
  const calendarsQuery = useQuery({ queryKey: ["imported-calendars"], queryFn: fetchImportedCalendars });
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "info" | "error"; message: string } | null>(null);

  const invalidateCalendars = () => {
    queryClient.invalidateQueries({ queryKey: ["imported-calendars"] });
    queryClient.invalidateQueries({ queryKey: ["imported-calendars", "overview"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const addCalendarMutation = useMutation({
    mutationFn: ({ name, url }: FormState) => addICalCalendar(name, url),
    onMutate: () => {
      setFormError(null);
      setStatus(null);
    },
    onSuccess: (calendar) => {
      invalidateCalendars();
      setFormState(EMPTY_FORM);
      setStatus({ type: "info", message: `Calendar "${calendar.name}" added. Trigger a sync to import events.` });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to add calendar.";
      setFormError(message);
    },
  });

  const syncCalendarMutation = useMutation({
    mutationFn: (calendarId: number) => syncICalCalendar(calendarId),
    onMutate: () => {
      setStatus(null);
    },
    onSuccess: (_, calendarId) => {
      invalidateCalendars();
      const calendar = calendarsQuery.data?.find((item) => item.id === calendarId);
      setStatus({
        type: "info",
        message: calendar ? `Synced "${calendar.name}" successfully.` : "Calendar synced.",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to sync calendar.";
      setStatus({ type: "error", message });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setFormError("Provide a friendly name for the calendar.");
      return;
    }
    if (!formState.url.trim()) {
      setFormError("Enter a valid iCal URL.");
      return;
    }

    addCalendarMutation.mutate({ name: formState.name.trim(), url: formState.url.trim() });
  };

  const calendars = calendarsQuery.data ?? [];
  const isLoading = calendarsQuery.isLoading || calendarsQuery.isRefetching;

  return (
    <Card className="border-slate-700 bg-slate-900 text-slate-100 shadow-xl">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-lg text-white">External Calendars</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="calendar-name" className="text-slate-200">
              Name
            </Label>
            <Input
              id="calendar-name"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Work Calendar"
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-url" className="text-slate-200">
              iCal URL
            </Label>
            <Input
              id="calendar-url"
              value={formState.url}
              onChange={(event) => setFormState((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="https://.../calendar.ics"
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
          <Button
            type="submit"
            className="w-full bg-blue-600 text-white hover:bg-blue-500"
            disabled={addCalendarMutation.isPending}
          >
            {addCalendarMutation.isPending ? "Adding..." : "Add Calendar"}
          </Button>
        </form>

        <Separator className="border-slate-800" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Connected Calendars</h3>
            <Button
              variant="secondary"
              size="sm"
              className="bg-slate-800 text-slate-100 hover:bg-slate-700"
              disabled={!calendars.length || syncCalendarMutation.isPending || isLoading}
              onClick={async () => {
                for (const calendar of calendars) {
                  try {
                    await syncCalendarMutation.mutateAsync(calendar.id);
                  } catch {
                    break;
                  }
                }
              }}
            >
              {syncCalendarMutation.isPending ? "Syncing..." : "Sync All"}
            </Button>
          </div>
          {calendarsQuery.isError ? (
            <p className="text-sm text-rose-300">Unable to load connected calendars.</p>
          ) : !calendars.length ? (
            <p className="text-sm text-slate-400">No calendars connected yet.</p>
          ) : (
            <ul className="space-y-2">
              {calendars.map((calendar) => (
                <li
                  key={calendar.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{calendar.name}</p>
                    <p className="break-all text-xs text-slate-400">{calendar.url}</p>
                    <p className="text-xs text-slate-500">
                      Last synced: {calendar.last_synced ? new Date(calendar.last_synced).toLocaleString() : "Never"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="bg-slate-800 text-slate-100 hover:bg-slate-700"
                    disabled={syncCalendarMutation.isPending}
                    onClick={() => syncCalendarMutation.mutate(calendar.id)}
                  >
                    Sync
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {status ? (
          <p className={`text-sm ${status.type === "error" ? "text-rose-300" : "text-slate-400"}`}>
            {status.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
