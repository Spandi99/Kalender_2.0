import type { CalendarEvent } from "../api/client";
import { getServiceWorkerRegistration } from "./serviceWorkerRegistration";

export const NOTIFICATION_LEAD_MINUTES = 15;
const NOTIFICATION_STORAGE_KEY = "orgalifer:notifications:v1";

export interface ScheduledNotification {
  id: number;
  title: string;
  start: string;
  triggerAt: number;
  body: string;
  url: string;
}

function computeTriggerTimestamp(start: string, leadMinutes: number): number {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return Number.NaN;
  }
  return startDate.getTime() - leadMinutes * 60_000;
}

function sanitizeEvents(events: CalendarEvent[], leadMinutes: number): ScheduledNotification[] {
  const now = Date.now();
  return events
    .map((event) => {
      const triggerAt = computeTriggerTimestamp(event.start, leadMinutes);
      if (!Number.isFinite(triggerAt)) {
        return null;
      }

      if (new Date(event.end).getTime() < now) {
        return null;
      }

      const title = event.title?.trim() || "Upcoming event";
      const body = event.description?.trim() || "Starts soon";
      const url = `/dashboard/calendar?focus=${event.id}`;

      return {
        id: event.id,
        title,
        start: event.start,
        triggerAt,
        body,
        url,
      } satisfies ScheduledNotification;
    })
    .filter((event): event is ScheduledNotification => Boolean(event))
    .filter((event) => event.triggerAt >= now - 5 * 60_000)
    .sort((a, b) => a.triggerAt - b.triggerAt);
}

export function persistLocalSchedule(schedule: ScheduledNotification[]): void {
  try {
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(schedule));
  } catch (error) {
    console.warn("Unable to persist notification schedule", error);
  }
}

export function readLocalSchedule(): ScheduledNotification[] {
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => ({
        id: Number(entry.id),
        title: String(entry.title ?? "Upcoming event"),
        start: String(entry.start ?? ""),
        triggerAt: Number(entry.triggerAt ?? Number.NaN),
        body: String(entry.body ?? "Starts soon"),
        url: String(entry.url ?? "/dashboard/calendar"),
      }))
      .filter((entry) => Number.isFinite(entry.triggerAt));
  } catch (error) {
    console.warn("Unable to read notification schedule", error);
    return [];
  }
}

async function postMessageToServiceWorker(message: unknown): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const registration = await getServiceWorkerRegistration();
  const worker = navigator.serviceWorker.controller ?? registration?.active ?? registration?.waiting ?? registration?.installing ?? null;
  worker?.postMessage(message);
}

export async function syncEventNotifications(
  events: CalendarEvent[],
  leadMinutes: number = NOTIFICATION_LEAD_MINUTES
): Promise<ScheduledNotification[]> {
  if (typeof window === "undefined") {
    return [];
  }

  const schedule = sanitizeEvents(events, leadMinutes);
  persistLocalSchedule(schedule);

  try {
    await postMessageToServiceWorker({ type: "SYNC_EVENTS", events: schedule });
  } catch (error) {
    console.warn("Unable to sync events with service worker", error);
  }

  return schedule;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "denied";
  }

  if (Notification.permission === "default") {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.warn("Notification permission request failed", error);
      return Notification.permission;
    }
  }

  return Notification.permission;
}

export function createFallbackTimer(
  schedule: ScheduledNotification[],
  callback: (event: ScheduledNotification) => void
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let timeoutId: number | null = null;

  const now = Date.now();
  const upcoming = schedule.filter((event) => event.triggerAt >= now).sort((a, b) => a.triggerAt - b.triggerAt);

  function arm(index: number) {
    if (!upcoming[index]) {
      return;
    }

    const event = upcoming[index];
    const delay = Math.max(0, event.triggerAt - Date.now());
    timeoutId = window.setTimeout(() => {
      callback(event);
      arm(index + 1);
    }, delay);
  }

  arm(0);

  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}
