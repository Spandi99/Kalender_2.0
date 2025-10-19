import { useMemo, useCallback } from "react";
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
import { adjustLuminance, getReadableTextColor, mixColors, withAlpha } from "../../utils/colorUtils";

export interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectRange: (range: { start: Date; end: Date }) => void;
  onEventClick: (eventId: number) => void;
  timeZone?: string;
  locale?: string;
}

const CATEGORY_COLORS = ["#0066FF", "#00C896", "#F97316", "#A855F7", "#EC4899", "#38BDF8", "#F59E0B", "#22D3EE"];

const toLocalCalendarDate = (value: string) => {
  if (!value) {
    return value;
  }
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, "");
};

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

export function CalendarView({ events, onSelectRange, onEventClick, timeZone = "local", locale }: CalendarViewProps) {

  const renderEventContent = useCallback((info: EventContentArg) => {
    const viewType = info.view.type;
    const isTimeGridView = viewType.startsWith("timeGrid");
    const root = document.createElement("div");
    root.style.whiteSpace = "normal";
    root.style.wordBreak = "break-word";

    const timeText = info.timeText ? info.timeText.replace(/\s+/g, " ").trim() : "";
    const title = info.event.title?.trim() ?? "";
    const description = typeof info.event.extendedProps?.description === "string"
      ? info.event.extendedProps.description.trim()
      : "";

    if (isTimeGridView) {
      root.className = "org-event-content org-event-timegrid";

      const localeOption = info.view.calendar.getOption("locale");
      const locale = (typeof localeOption === "string" && localeOption) ||
        (typeof window !== "undefined" && window.navigator?.language) ||
        "en-US";
      const formatter = typeof Intl !== "undefined"
        ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false })
        : null;

      const startDate = info.event.start instanceof Date ? info.event.start : null;
      const endDate = info.event.end instanceof Date ? info.event.end : null;
      const rangeText = formatter && startDate
        ? endDate
          ? `${formatter.format(startDate)} – ${formatter.format(endDate)}`
          : formatter.format(startDate)
        : info.timeText ?? "";
      const headline = [rangeText, title].filter(Boolean).join(" ").trim();

      const headlineEl = document.createElement("div");
      headlineEl.className = "org-event-line org-timegrid-headline";
      headlineEl.textContent = headline || title || rangeText || "Event";
      root.appendChild(headlineEl);

      if (!title && description) {
        const descriptionEl = document.createElement("div");
        descriptionEl.className = "org-event-line org-timegrid-description";
        descriptionEl.textContent = description;
        root.appendChild(descriptionEl);
      }
    } else {
      root.className = "org-event-content org-event-daygrid";

      if (timeText) {
        const timeEl = document.createElement("div");
        timeEl.className = "org-event-line org-daygrid-time";
        timeEl.textContent = timeText;
        root.appendChild(timeEl);
      }

      if (title) {
        const titleEl = document.createElement("div");
        titleEl.className = "org-event-line org-daygrid-title";
        titleEl.textContent = title;
        root.appendChild(titleEl);
      }

      if (description) {
        const descriptionEl = document.createElement("div");
        descriptionEl.className = "org-event-line org-daygrid-description";
        descriptionEl.textContent = description;
        root.appendChild(descriptionEl);
      }

    }

    const tooltip = [timeText, title, description].filter(Boolean).join(" • ");
    if (tooltip) {
      root.setAttribute("title", tooltip);
    }

    return { domNodes: [root] };
  }, []);

  const handleEventDidMount = useCallback((info: EventMountArg) => {
    const timeText = info.timeText ? info.timeText.replace(/\s+/g, " ").trim() : "";
    const title = info.event.title?.trim() ?? "";
    const description = typeof info.event.extendedProps?.description === "string"
      ? info.event.extendedProps.description.trim()
      : "";
    const tooltip = [timeText, title, description].filter(Boolean).join(" • ");
    if (tooltip) {
      info.el.setAttribute("title", tooltip);
    }
  }, []);


  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
        const categoryColor = resolveCategoryColor(event.category);
        const surface = event.completed ? adjustLuminance(categoryColor, -0.15) : categoryColor;
        const backgroundColor = withAlpha(surface, event.completed ? 0.72 : 0.85);
        const borderColor = mixColors(surface, "#020617", 0.65);
        const textColor = getReadableTextColor(backgroundColor, {
          lightColor: "#ffffff",
          darkColor: "#0f172a",
        });

        return {
          display: "block",
          id: String(event.id),
          title: event.title,
          start: toLocalCalendarDate(event.start),
          end: toLocalCalendarDate(event.end),
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
        initialView="dayGridMonth"
        timeZone={timeZone}
        locale={locale}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        selectable
        selectMirror
        events={calendarEvents}
        select={handleSelect}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        eventDidMount={handleEventDidMount}
        slotEventOverlap={false}
        eventOverlap={false}
        eventMaxStack={3}
        aspectRatio={1.45}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        dayHeaderClassNames={["bg-slate-900 text-slate-200"]}
        height="100%"
      />
    </div>
  );
}
