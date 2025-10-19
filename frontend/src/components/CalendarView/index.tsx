import { useMemo } from "react";
import FullCalendar, { DateSelectArg, EventClickArg } from "@fullcalendar/react";
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
          id: String(event.id),
          title: event.title,
          start: toLocalCalendarDate(event.start),
          end: toLocalCalendarDate(event.end),
          classNames: [
            "rounded-xl",
            "px-2",
            "py-1",
            "text-sm",
            "font-semibold",
            "shadow",
            "shadow-slate-900/20",
          ],
          backgroundColor,
          borderColor,
          textColor,
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
    <div className="h-full rounded-3xl border border-slate-700 bg-slate-950/90 p-4 text-slate-100 shadow-xl">
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
        aspectRatio={1.45}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        dayHeaderClassNames={["bg-slate-900 text-slate-200"]}
        height="100%"
      />
    </div>
  );
}
