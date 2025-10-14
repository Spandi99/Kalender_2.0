import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { ExternalCalendar, fetchExternalCalendars, importIcal, syncCalendar } from "../api/client";

function formatLastSynced(value: string | null) {
  if (!value) {
    return "Never";
  }
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

export function CalendarIntegration() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const calendarsQuery = useQuery({
    queryKey: ["external-calendars"],
    queryFn: fetchExternalCalendars,
  });

  const importMutation = useMutation<ExternalCalendar>({
    mutationFn: () => importIcal(name, url),
    onMutate: () => {
      setError(null);
    },
    onSuccess: () => {
      setName("");
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["external-calendars"] });
    },
    onError: (mutationError: unknown) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to import calendar.");
    },
  });

  const syncMutation = useMutation<{ imported: number }, unknown, number>({
    mutationFn: (calendarId: number) => syncCalendar(calendarId),
    onMutate: () => {
      setError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-calendars"] });
    },
    onError: (mutationError: unknown) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to sync calendar.");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name || !url) {
      setError("Please provide both a calendar name and a valid iCal URL.");
      return;
    }
    importMutation.mutate();
  };

  const calendars: ExternalCalendar[] = useMemo(() => calendarsQuery.data ?? [], [calendarsQuery.data]);

  const syncingId = syncMutation.variables ?? null;

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Settings</p>
        <h2 className="text-2xl font-semibold">External Calendars</h2>
        <p className="text-sm text-muted-foreground">
          Import events from external calendar feeds. Imported events remain read-only inside AI Calendar XP.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="calendar-name">Calendar name</Label>
          <Input
            id="calendar-name"
            placeholder="e.g. Team Schedule"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={importMutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calendar-url">iCal URL</Label>
          <Input
            id="calendar-url"
            type="url"
            placeholder="https://example.com/calendar.ics"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={importMutation.isPending}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={importMutation.isPending} className="w-full">
          {importMutation.isPending ? "Importing…" : "Import calendar"}
        </Button>
      </form>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Connected calendars</h3>
        <p className="text-sm text-muted-foreground">
          Sync to pull the latest events from an external source.
        </p>
        <div className="rounded-md border">
          <div className="grid grid-cols-[1.5fr_2fr_1fr_0.75fr] items-center gap-2 border-b bg-muted/50 p-3 text-sm font-semibold text-muted-foreground">
            <span>Name</span>
            <span>URL</span>
            <span>Last synced</span>
            <span className="text-right">Actions</span>
          </div>
          {calendarsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading external calendars…</div>
          ) : calendarsQuery.isError ? (
            <div className="p-4 text-sm text-destructive">Failed to load external calendars.</div>
          ) : calendars.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No external calendars connected yet.</div>
          ) : (
            calendars.map((calendar) => (
              <div
                key={calendar.id}
                className="grid grid-cols-[1.5fr_2fr_1fr_0.75fr] items-center gap-2 border-t p-3 text-sm"
              >
                <span className="font-medium">{calendar.name}</span>
                <span className="truncate text-xs text-muted-foreground" title={calendar.url}>
                  {calendar.url}
                </span>
                <span>{formatLastSynced(calendar.last_synced)}</span>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => syncMutation.mutate(calendar.id)}
                    disabled={syncMutation.isPending && syncingId === calendar.id}
                  >
                    {syncMutation.isPending && syncingId === calendar.id ? "Syncing…" : "Sync now"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
