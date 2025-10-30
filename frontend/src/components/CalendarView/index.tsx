import { useMemo, useCallback, useEffect, useState } from "react";
import FullCalendar, { DateSelectArg, EventClickArg } from "@fullcalendar/react";
import type { EventContentArg, EventMountArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";

// --- FullCalendar Styles (safe import for Docker/Vite) ---
import "@fullcalendar/daygrid/main.css";
import "@fullcalendar/timegrid/main.css";
import "@fullcalendar/list/main.css";
// ----------------------------------------------------------

import type { CalendarEvent } from "../../api/client";
import { LOCAL_TIMEZONE, formatTime } from "../../lib/datetime";
import { adjustLuminance, getReadableTextColor, mixColors, withAlpha } from "../../utils/colorUtils";

export interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectRange: (range: { start: Date; end: Date }) => void;
  onEventClick: (eventId: number) => void;
  timeZone?: string;
  locale?: string;
}

const CATEGORY_COLORS = ["#0066FF", "#00C896", "#F97316", "#A855F7", "#EC4899", "#38BDF8", "#F59E0B", "#22D3EE"];

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOCAL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: LOCAL_TIMEZONE,
  timeZoneName: "shortOffset",
  hour: "2-digit",
});

function toZonedISOString(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const parts = zonedFormatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? (type === "second" ? "00" : "01");

  const offsetLabel =
    offsetFormatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT+00";
  const match = offsetLabel.match(/([+-]\d{1,2})(?::?(\d{2}))?/);
  const hoursRaw = match ? Number.parseInt(match[1], 10) : 0;
  const minutesRaw = match && match[2] ? Number.parseInt(match[2], 10) : 0;
  const hoursComponent = Number.isFinite(hoursRaw) ? hoursRaw : 0;
  const minutesComponent = Number.isFinite(minutesRaw) ? minutesRaw : 0;
  const normalizedHours = `${hoursComponent >= 0 ? "+" : "-"}${Math.abs(hoursComponent)
    .toString()
    .padStart(2, "0")}`;
  const normalizedMinutes = minutesComponent.toString().padStart(2, "0");
  const offset = `${normalizedHours}:${normalizedMinutes}`;

  return `${lookup("year")}-${lookup("month")}-${lookup("day")}T${lookup("hour")}:${lookup("minute")}:${lookup(
    "second"
  )}${offset}`;
}


function hashCategory(category: string) {
  let hash = 0;
  for (let index = 0; index < category.length; index += 1) {
    hash = (hash << 5) - hash + category.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveCategoryColor(category: string) {
  if (!category) {
    return CATEGORY_COLORS[0];
  }
  const hash = hashCategory(category);
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

function resolveLocale(view: EventContentArg["view"]) {
  const localeOption = view?.calendar?.getOption?.("locale");
  if (typeof localeOption === "string" && localeOption.length > 0) {
    return localeOption;
  }
  if (typeof window !== "undefined" && typeof window.navigator?.language === "string" && window.navigator.language.length > 0) {
    return window.navigator.language;
  }
  return "en-US";
}

function formatEventTimeRange(event: EventContentArg["event"], locale: string, fallback: string) {
  if (!event.start) {
    return fallback;
  }

  const startLabel = typeof event.extendedProps?.startTimeLabel === "string" ? event.extendedProps.startTimeLabel : null;
  const endLabel = typeof event.extendedProps?.endTimeLabel === "string" ? event.extendedProps.endTimeLabel : null;

  if (startLabel) {
    if (endLabel && endLabel !== startLabel) {
      return `${startLabel} – ${endLabel}`;
    }
    return startLabel;
  }

  if (event.allDay) {
    const multiDay = event.end && event.end.getTime() - event.start.getTime() > 24 * 60 * 60 * 1000;
    if (!multiDay) {
      return locale.toLowerCase().startsWith("de") ? "Ganztägig" : "All Day";
    }
  }

  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat === "undefined") {
    return fallback || "";
  }

  const startProp = event.extendedProps?.startTimeLabel;
  const endProp = event.extendedProps?.endTimeLabel;

  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LOCAL_TIMEZONE,
  });

  const startText = typeof startProp === "string" && startProp
    ? startProp
    : event.start
      ? formatter.format(event.start)
      : "";

  let endText = "";

  if (typeof endProp === "string" && endProp) {
    endText = endProp;
  } else if (event.end) {
    const effectiveEnd = event.allDay ? new Date(event.end.getTime() - 60_000) : event.end;
    endText = formatter.format(effectiveEnd);
  }

  if (endText && endText !== startText) {
    return `${startText} – ${endText}`;
  }

  return startText || fallback || "";
}

function resolveTitleLimit(viewType: string) {
  if (viewType.startsWith("timeGrid")) {
    return 90;
  }
  if (viewType.startsWith("list")) {
    return 120;
  }
  return 60;
}

function truncateWithEllipsis(text: string, maxLength: number) {
  const clean = text.trim();
  if (clean.length <= maxLength) {
    return clean;
  }

  const slice = clean.slice(0, maxLength);
  const candidates = [slice.lastIndexOf(" "), slice.lastIndexOf("-"), slice.lastIndexOf("·"), slice.lastIndexOf(":"), slice.lastIndexOf("/")];
  const cutIndex = Math.max(...candidates);
  const safeSlice = cutIndex > 16 ? slice.slice(0, cutIndex) : slice;
  return `${safeSlice.replace(/[\s\-·:/]+$/, "")}…`;
}

export function CalendarView({ events, onSelectRange, onEventClick, timeZone = LOCAL_TIMEZONE, locale }: CalendarViewProps) {
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(max-width: 768px)");
    const updateMatch = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsCompactLayout(event.matches);
    };

    updateMatch(media);

    if (typeof media.addEventListener === "function") {
      const handler = (event: MediaQueryListEvent) => updateMatch(event);
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    const legacyHandler = (event: MediaQueryListEvent) => updateMatch(event);
    media.addListener(legacyHandler);
    return () => media.removeListener(legacyHandler);
  }, []);

  const calendarAspectRatio = isCompactLayout ? 0.85 : 1.45;
  const calendarHeight: "auto" | "100%" = isCompactLayout ? "auto" : "100%";
  const calendarEventStack = isCompactLayout ? 2 : 3;
  const calendarDayMaxRows = isCompactLayout ? 3 : 5;
  const initialCalendarView = isCompactLayout ? "listWeek" : "dayGridMonth";
  const toolbarConfig = isCompactLayout
    ? { left: "prev,next today", center: "title", right: "listWeek,timeGridDay" }
    : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listWeek" };

  const renderEventContent = useCallback((info: EventContentArg) => {
    const localeForEvent = resolveLocale(info.view);
    const root = document.createElement("div");
    root.className = `org-event-content org-event-${info.view.type}`;
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.gap = "0.25rem";
    root.style.whiteSpace = "normal";
    root.style.wordBreak = "break-word";

    const timeText = formatEventTimeRange(info.event, localeForEvent, info.timeText ?? "");
    const title = info.event.title?.trim() ?? "";
    const description = typeof info.event.extendedProps?.description === "string"
      ? info.event.extendedProps.description.trim()
      : "";

    if (timeText) {
      const timeEl = document.createElement("div");
      timeEl.className = "org-event-line org-event-time";
      timeEl.textContent = timeText;
      root.appendChild(timeEl);
    }

    const titleLimit = resolveTitleLimit(info.view.type);
    if (title) {
      const displayTitle = truncateWithEllipsis(title, titleLimit);
      const titleEl = document.createElement("div");
      titleEl.className = "org-event-line org-event-title";
      titleEl.textContent = displayTitle;
      titleEl.style.display = "-webkit-box";
      titleEl.style.setProperty("-webkit-line-clamp", "2");
      titleEl.style.setProperty("-webkit-box-orient", "vertical");
      titleEl.style.overflow = "hidden";
      titleEl.style.textOverflow = "ellipsis";
      titleEl.style.wordBreak = "break-word";
      root.appendChild(titleEl);
    } else if (description) {
      const displayDescription = truncateWithEllipsis(description, titleLimit);
      const descriptionEl = document.createElement("div");
      descriptionEl.className = "org-event-line org-event-description";
      descriptionEl.textContent = displayDescription;
      descriptionEl.style.display = "-webkit-box";
      descriptionEl.style.setProperty("-webkit-line-clamp", "2");
      descriptionEl.style.setProperty("-webkit-box-orient", "vertical");
      descriptionEl.style.overflow = "hidden";
      descriptionEl.style.textOverflow = "ellipsis";
      descriptionEl.style.wordBreak = "break-word";
      root.appendChild(descriptionEl);
    }

    const tooltipParts = [timeText || info.timeText || "", title, description].filter(Boolean);
    if (tooltipParts.length > 0) {
      root.setAttribute("title", tooltipParts.join(" • "));
    }

    if (info.event.extendedProps?.completed) {
      const statusEl = document.createElement("div");
      statusEl.className = "org-event-line org-event-status text-xs font-semibold text-emerald-100";
      statusEl.textContent = "✔ Abgeschlossen";
      root.appendChild(statusEl);
    }

    return { domNodes: [root] };
  }, []);

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    const localeForEvent = resolveLocale(info.view);
    const timeText = formatEventTimeRange(info.event, localeForEvent, info.timeText ?? "");
    const title = info.event.title?.trim() ?? "";
    const description = typeof info.event.extendedProps?.description === "string"
      ? info.event.extendedProps.description.trim()
      : "";
    const tooltipParts = [timeText || info.timeText || "", title, description].filter(Boolean);
    if (tooltipParts.length > 0) {
      info.el.setAttribute("title", tooltipParts.join(" • "));
    }
  }, []);

  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
        const baseColor = event.color ?? resolveCategoryColor(event.category);
        const surface = event.completed ? "#16a34a" : baseColor;
        const backgroundColor = withAlpha(surface, event.completed ? 0.9 : 0.85);
        const borderColor = mixColors(surface, "#020617", event.completed ? 0.4 : 0.65);
        const textColor = getReadableTextColor(backgroundColor, {
          lightColor: "#ffffff",
          darkColor: "#0f172a",
        });

        const start = toZonedISOString(event.start) ?? event.start;
        const end = toZonedISOString(event.end ?? undefined) ?? event.end;

        const zonedStart = toZonedISOString(event.start) ?? event.start;
        const zonedEnd = toZonedISOString(event.end ?? undefined) ?? event.end;
        const startTimeLabel = formatTime(event.start);
        const endTimeLabel = formatTime(event.end ?? undefined);

        return {
          display: "block",
          id: String(event.id),
          title: event.title,
          start: zonedStart,
          end: zonedEnd,
          classNames: [
            "fc-orgalifer-event",
            "rounded-xl",
            "px-3",
            "py-2",
            "text-sm",
            "font-semibold",
            "shadow",
            "shadow-slate-900/20",
          ],
          backgroundColor,
          borderColor,
          textColor,
          extendedProps: {
            description: event.description ?? "",
            completed: event.completed,
            startTimeLabel,
            endTimeLabel,
          },
        };
      }),
    [events]
  );

  const handleSelect = (selectionInfo: DateSelectArg) => {
    onSelectRange({
      start: new Date(selectionInfo.start.getTime()),
      end: new Date(selectionInfo.end.getTime()),
    });
  };

  const handleEventClick = (info: EventClickArg) => {
    onEventClick(Number(info.event.id));
  };

  return (
    <div className="fc-orgalifer h-full rounded-3xl border border-slate-700 bg-slate-950/90 p-4 text-slate-100 shadow-xl">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={initialCalendarView}
        timeZone={timeZone}
        locale={locale}
        headerToolbar={toolbarConfig}
        selectable
        selectMirror
        events={calendarEvents}
        select={handleSelect}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        eventDidMount={handleEventDidMount}
        slotEventOverlap={false}
        eventOverlap={false}
        eventMaxStack={calendarEventStack}
        dayMaxEventRows={calendarDayMaxRows}
        expandRows={!isCompactLayout}
        aspectRatio={calendarAspectRatio}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        dayHeaderClassNames={["bg-slate-900 text-slate-200"]}
        height={calendarHeight}
        buttonText={{ listWeek: "Liste", timeGridDay: "Tag", dayGridMonth: "Monat", timeGridWeek: "Woche" }}
        moreLinkClick="popover"
      />
    </div>
  );
}
