import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarDays, Clock3, RefreshCcw, Sparkles, BellRing } from "lucide-react";

import { fetchEvents, type CalendarEvent } from "../../api/client";
import { formatDateTimeRange } from "../../lib/datetime";
import {
  createFallbackTimer,
  ensureNotificationPermission,
  syncEventNotifications,
  type ScheduledNotification,
  NOTIFICATION_LEAD_MINUTES,
} from "../../lib/notifications";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const REFRESH_INTERVAL = 60_000;

function resolveNextEvent(events: CalendarEvent[]): CalendarEvent | null {
  const now = Date.now();
  return events
    .filter((event) => new Date(event.end).getTime() > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null;
}

function formatEventTime(event: CalendarEvent): string {
  return formatDateTimeRange(event.start, event.end);
}

function formatCountdown(target: Date | null): string {
  if (!target || Number.isNaN(target.getTime())) {
    return "";
  }

  const now = Date.now();
  const diffMs = target.getTime() - now;

  if (diffMs <= 0) {
    return "Starting now";
  }

  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) {
    return "Starting in under 1 minute";
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const hourPart = hours > 0 ? `${hours}h` : "";
  const minutePart = minutes > 0 ? `${minutes}m` : "";
  return [hourPart, minutePart].filter(Boolean).join(" ") || `${diffMinutes}m`;
}

export function NextEventWidget() {
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      return "denied";
    }
    return Notification.permission;
  });
  const [schedule, setSchedule] = useState<ScheduledNotification[]>([]);
  const [fallbackEvent, setFallbackEvent] = useState<ScheduledNotification | null>(null);
  const fallbackCancelRef = useRef<(() => void) | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const [countdownText, setCountdownText] = useState<string>("");

  const eventsQuery = useQuery({
    queryKey: ["events", "next-widget"],
    queryFn: fetchEvents,
    initialData: () => queryClient.getQueryData<CalendarEvent[]>(["events", "dashboard"]),
    refetchInterval: REFRESH_INTERVAL,
    staleTime: REFRESH_INTERVAL,
  });

  const events = eventsQuery.data ?? [];
  const nextEvent = useMemo(() => resolveNextEvent(events), [events]);

  useEffect(() => {
    if (!nextEvent) {
      setCountdownText("");
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    const updateCountdown = () => {
      setCountdownText(formatCountdown(new Date(nextEvent.start)));
    };

    updateCountdown();
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
    }
    countdownIntervalRef.current = window.setInterval(updateCountdown, 30_000);

    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [nextEvent?.start]);

  useEffect(() => {
    if (events.length === 0) {
      setSchedule([]);
      return;
    }

    let active = true;

    (async () => {
      const nextSchedule = await syncEventNotifications(events);
      if (!active) {
        return;
      }
      setSchedule(nextSchedule);
    })();

    return () => {
      active = false;
    };
  }, [events]);

  useEffect(() => {
    if (permission === "granted") {
      fallbackCancelRef.current?.();
      fallbackCancelRef.current = null;
      setFallbackEvent(null);
      return;
    }

    if (schedule.length === 0) {
      fallbackCancelRef.current?.();
      fallbackCancelRef.current = null;
      return;
    }

    fallbackCancelRef.current?.();
    fallbackCancelRef.current = createFallbackTimer(schedule, (event) => {
      setFallbackEvent(event);
    });

    return () => {
      fallbackCancelRef.current?.();
      fallbackCancelRef.current = null;
    };
  }, [permission, schedule]);

  useEffect(() => () => {
    fallbackCancelRef.current?.();
    fallbackCancelRef.current = null;
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleEnableNotifications = async () => {
    const result = await ensureNotificationPermission();
    setPermission(result);
  };

  const closeFallback = () => {
    setFallbackEvent(null);
  };

  const handleFallbackOpenChange = (open: boolean) => {
    if (!open) {
      setFallbackEvent(null);
    }
  };

  const leadTimeText = `Notifications arrive ${NOTIFICATION_LEAD_MINUTES} minutes before start.`;

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-5 text-slate-100 shadow-xl backdrop-blur-lg"
      aria-label="Next event overview"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-purple-500/10" aria-hidden />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-blue-200/80">
            <CalendarClock className="h-4 w-4" aria-hidden />
            <span>Up next</span>
          </div>
          {nextEvent ? (
            <>
              <h2 className="text-xl font-semibold sm:text-2xl">{nextEvent.title}</h2>
              <p className="flex items-center gap-2 text-sm text-slate-200/90">
                <CalendarDays className="h-4 w-4" aria-hidden />
                <span>{formatEventTime(nextEvent)}</span>
              </p>
              {countdownText ? (
                <p className="flex items-center gap-2 text-sm text-slate-300/90">
                  <Clock3 className="h-4 w-4" aria-hidden />
                  <span>Next: {countdownText}</span>
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">No upcoming events</h2>
              <p className="text-sm text-slate-300/80">
                You're all caught up. Schedule your next focus block to keep momentum.
              </p>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300/80">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span>{leadTimeText}</span>
          </div>
          {permission !== "granted" ? (
            <Button
              type="button"
              variant="outline"
              className="border-blue-400/60 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
              onClick={handleEnableNotifications}
            >
              <BellRing className="mr-2 h-4 w-4" aria-hidden /> Enable notifications
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-200/90">
              <BellRing className="h-4 w-4" aria-hidden />
              <span>Notifications enabled</span>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-center text-xs text-slate-300 hover:text-white"
            onClick={() => eventsQuery.refetch()}
            disabled={eventsQuery.isFetching}
          >
            <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${eventsQuery.isFetching ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      <Dialog open={fallbackEvent != null} onOpenChange={handleFallbackOpenChange}>
        <DialogContent className="max-w-sm border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <BellRing className="h-5 w-5 text-amber-300" aria-hidden />
              Upcoming event
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              {fallbackEvent ? `"${fallbackEvent.title}" starts in 15 minutes.` : null}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            <p>{fallbackEvent?.body ?? "Stay sharp, your next session approaches."}</p>
            <p className="text-xs text-slate-400">
              Enable push notifications to receive alerts even when the app is closed.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="default" onClick={closeFallback}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default NextEventWidget;
