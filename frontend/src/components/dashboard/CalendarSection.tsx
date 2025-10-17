import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock3, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import type { CalendarEvent } from "../../api/client";
import { fetchEvents } from "../../api/client";
import { CalendarView } from "../CalendarView";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

interface SelectedDetails {
  event?: CalendarEvent;
  range?: { start: Date; end: Date };
}

export function CalendarSection() {
  const [details, setDetails] = useState<SelectedDetails | null>(null);
  const eventsQuery = useQuery({
    queryKey: ["events", "dashboard"],
    queryFn: fetchEvents,
    refetchInterval: 60_000,
  });

  const events = eventsQuery.data ?? [];

  const calendarDescription = useMemo(() => {
    if (!details?.event) return null;
    const formatter = new Intl.DateTimeFormat("de-CH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Zurich",
    });
    const start = formatter.format(new Date(details.event.start));
    const end = formatter.format(new Date(details.event.end));
    return `${start} – ${end}`;
  }, [details]);

  return (
    <motion.div
      layout
      className="flex h-full flex-col gap-4 rounded-3xl bg-white/80 p-4 shadow-xl ring-1 ring-inset ring-slate-200/80 backdrop-blur dark:bg-slate-900/60 dark:ring-slate-800"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Kalender &amp; Templates</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Synchronisiert Events, Day-Templates und iCal-Importe. Auswahl öffnet Details, Zeitfenster übernehmen Templates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/legacy">
              <ExternalLink className="mr-2 h-4 w-4" />
              Vollbild-Ansicht
            </Link>
          </Button>
          <Button variant="default" size="sm" onClick={() => setDetails({ range: undefined })}>
            <Sparkles className="mr-2 h-4 w-4" />
            Template anwenden
          </Button>
        </div>
      </div>

      <div className="flex-1">
        {eventsQuery.isLoading ? (
          <div className="flex h-[520px] flex-col items-center justify-center text-slate-500">
            <Loader2 className="mb-3 h-6 w-6 animate-spin" />
            Lade Events…
          </div>
        ) : (
          <CalendarView
            events={events}
            onSelectRange={(range) => setDetails({ range })}
            onEventClick={(eventId) => {
              const event = events.find((item) => item.id === eventId);
              setDetails({ event });
            }}
            timeZone="Europe/Zurich"
            locale="de"
          />
        )}
      </div>

      <Dialog open={details != null} onOpenChange={(open) => (!open ? setDetails(null) : null)}>
        <DialogContent className="sm:max-w-lg">
          {details?.event ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl">
                  <Clock3 className="h-5 w-5 text-blue-500" />
                  {details.event.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  {calendarDescription}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4 text-sm">
                {details.event.description ? (
                  <p className="text-slate-700 dark:text-slate-200">{details.event.description}</p>
                ) : null}
                <div className="rounded-xl bg-slate-100 p-3 text-xs font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  Kategorie: {details.event.category}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDetails(null)}>
                  Schließen
                </Button>
                <Button asChild>
                  <Link to={`/legacy?event=${details.event.id}`}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Zum Feedback
                  </Link>
                </Button>
              </div>
            </>
          ) : details?.range ? (
            <>
              <DialogHeader>
                <DialogTitle>Zeitfenster auswählen</DialogTitle>
                <DialogDescription>
                  Du kannst dieses Zeitfenster über die Legacy-Ansicht mit einem Template füllen oder ein neues Event anlegen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p>
                  Start: {details.range.start.toLocaleString("de-CH", { timeZone: "Europe/Zurich" })}
                </p>
                <p>
                  Ende: {details.range.end.toLocaleString("de-CH", { timeZone: "Europe/Zurich" })}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDetails(null)}>
                  Abbrechen
                </Button>
                <Button asChild>
                  <Link to={`/legacy?start=${details.range.start.toISOString()}&end=${details.range.end.toISOString()}`}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    In Legacy öffnen
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Templates anwenden</DialogTitle>
                <DialogDescription>
                  Für detaillierte Template-Verwaltung öffne die klassische Oberfläche. Dort kannst du Day-Templates kombinieren und anpassen.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end">
                <Button asChild>
                  <Link to="/legacy#templates">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Template Manager öffnen
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
