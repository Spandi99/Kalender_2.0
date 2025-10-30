const STATIC_CACHE = "orgalifer-static-v1";
const DATA_CACHE = "orgalifer-data-v2";
const NOTIFICATION_STORE = "orgalifer-notifications-v1";
const SCHEDULE_REQUEST = new Request("/__orgalifer/internal/notifications", { method: "GET" });
const PRECACHE_URLS = ["/", "/manifest.json", "/assets/orgalifer-app-icon.png"];
const NOTIFICATION_LEAD_MS = 15 * 60 * 1000;

let scheduledEvents = [];
let tickerId = null;

function log(...args) {
  console.log("[Orgalifer SW]", ...args);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error("[Orgalifer SW] Failed to precache", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE, DATA_CACHE, NOTIFICATION_STORE].includes(cacheName)) {
              return caches.delete(cacheName);
            }
            return undefined;
          })
        )
      ),
      loadScheduleFromCache().then(() => {
        if (scheduledEvents.length > 0) {
          startTicker();
        }
      }),
    ]).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || request.headers.has("range")) {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          throw new Error("Network request failed and no cached response available.");
        })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        throw new Error("Network request failed and no cached response available.");
      })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }

  switch (data.type) {
    case "SKIP_WAITING": {
      self.skipWaiting();
      break;
    }
    case "SYNC_EVENTS": {
      if (Array.isArray(data.events)) {
        updateSchedule(data.events).catch((error) => {
          console.error("[Orgalifer SW] Failed to update schedule", error);
        });
      }
      break;
    }
    case "PING": {
      if (event.source && typeof event.source.postMessage === "function") {
        event.source.postMessage({ type: "PONG" });
      }
      break;
    }
    default:
      break;
  }
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const targetUrl = notification?.data?.url || "/dashboard/calendar";
  notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      const client = clientsList.find((entry) => entry.url.includes(targetUrl));
      if (client && "focus" in client) {
        return client.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const title = payload.title || "Orgalifer Update";
  const options = {
    body: payload.body,
    data: payload.data || {},
    icon: payload.icon || "/assets/orgalifer-app-icon.png",
    badge: payload.badge || "/assets/orgalifer-app-icon.png",
    tag: payload.tag,
    renotify: !!payload.renotify,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

async function loadScheduleFromCache() {
  try {
    const cache = await caches.open(NOTIFICATION_STORE);
    const match = await cache.match(SCHEDULE_REQUEST);
    if (!match) {
      scheduledEvents = [];
      return scheduledEvents;
    }
    const data = await match.json();
    if (Array.isArray(data?.events)) {
      scheduledEvents = data.events;
    } else {
      scheduledEvents = [];
    }
    return scheduledEvents;
  } catch (error) {
    console.error("[Orgalifer SW] Failed to load schedule", error);
    scheduledEvents = [];
    return scheduledEvents;
  }
}

async function persistSchedule(events) {
  try {
    const cache = await caches.open(NOTIFICATION_STORE);
    const response = new Response(JSON.stringify({ events }), {
      headers: { "Content-Type": "application/json" },
    });
    await cache.put(SCHEDULE_REQUEST, response);
    scheduledEvents = events;
  } catch (error) {
    console.error("[Orgalifer SW] Failed to persist schedule", error);
  }
}

async function updateSchedule(incomingEvents) {
  const now = Date.now();
  await loadScheduleFromCache();

  const previousById = new Map();
  for (const event of scheduledEvents) {
    previousById.set(event.id, event);
  }

  const sanitized = incomingEvents
    .map((raw) => sanitizeIncomingEvent(raw, now))
    .filter(Boolean)
    .sort((a, b) => a.triggerAt - b.triggerAt);

  const merged = sanitized.map((event) => {
    const existing = previousById.get(event.id);
    if (existing && existing.triggerAt === event.triggerAt) {
      return { ...existing, ...event };
    }
    return event;
  });

  await persistSchedule(merged);

  if (merged.length > 0) {
    startTicker();
  } else {
    stopTicker();
  }
}

function sanitizeIncomingEvent(raw, now) {
  if (!raw) {
    return null;
  }

  const id = Number(raw.id);
  const title = typeof raw.title === "string" && raw.title.trim().length > 0 ? raw.title.trim() : "Upcoming event";
  const start = typeof raw.start === "string" ? raw.start : null;
  const triggerAt = Number(raw.triggerAt);
  if (!Number.isFinite(id) || !start || !Number.isFinite(triggerAt)) {
    return null;
  }

  if (triggerAt < now - 5 * 60 * 1000) {
    return null;
  }

  const body = typeof raw.body === "string" ? raw.body : "Starting soon";
  const url = typeof raw.url === "string" && raw.url.length > 0 ? raw.url : "/dashboard/calendar";

  return {
    id,
    title,
    start,
    triggerAt,
    body,
    url,
    delivered: triggerAt < now ? Notification.permission === "granted" : false,
  };
}

function startTicker() {
  if (tickerId) {
    clearInterval(tickerId);
  }

  tickerId = setInterval(() => {
    checkDueNotifications().catch((error) => {
      console.error("[Orgalifer SW] Notification tick failed", error);
    });
  }, 60_000);

  checkDueNotifications().catch((error) => {
    console.error("[Orgalifer SW] Initial notification check failed", error);
  });
}

function stopTicker() {
  if (tickerId) {
    clearInterval(tickerId);
    tickerId = null;
  }
}

async function checkDueNotifications() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  const now = Date.now();
  const events = scheduledEvents.length > 0 ? scheduledEvents : await loadScheduleFromCache();
  let hasUpdates = false;

  for (const event of events) {
    if (event.delivered) {
      continue;
    }

    if (event.triggerAt <= now) {
      await showEventNotification(event);
      event.delivered = true;
      hasUpdates = true;
    }
  }

  if (hasUpdates) {
    await persistSchedule(events);
  }

  const upcoming = events.filter((event) => !event.delivered && event.triggerAt >= now - NOTIFICATION_LEAD_MS);
  if (upcoming.length === 0) {
    stopTicker();
  }
}

async function showEventNotification(event) {
  if (!self.registration?.showNotification) {
    return;
  }

  const eventStart = new Date(event.start);
  const locale = self.navigator?.language || "en-US";
  let timeText = "";
  if (!Number.isNaN(eventStart.getTime())) {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    timeText = formatter.format(eventStart);
  }

  const title = `Next: ${event.title}`;
  const body = timeText ? `${event.body} • ${timeText}` : event.body;

  const options = {
    body,
    data: { url: event.url, id: event.id },
    tag: `event-${event.id}`,
    renotify: false,
    requireInteraction: false,
    icon: "/assets/orgalifer-app-icon.png",
    badge: "/assets/orgalifer-app-icon.png",
    vibrate: [200, 100, 200],
    timestamp: eventStart.getTime(),
  };

  await self.registration.showNotification(title, options);
}
