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

export interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectRange: (range: { start: Date; end: Date }) => void;
  onEventClick: (eventId: number) => void;
  timeZone?: string;
  locale?: string;
}

const toLocalCalendarDate = (value: string) => {
  if (!value) {
    return value;
  }
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, "");
};

export function CalendarView({ events, onSelectRange, onEventClick, timeZone = "local", locale }: CalendarViewProps) {
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: String(event.id),
        title: event.title,
        start: toLocalCalendarDate(event.start),
        end: toLocalCalendarDate(event.end),
        classNames: [
          "rounded-lg",
          event.completed ? "bg-emerald-500/40" : "bg-blue-500/40",
          event.completed ? "text-emerald-100" : "text-blue-100",
        ],
      })),
    [events]
  );

  const handleSelect = (selectionInfo: DateSelectArg) => {
    onSelectRange({
      start: new Date(selectionInfo.start.getTime()),
      end: new Date(selectionInfo.end.getTime())
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
          right: "dayGridMonth,timeGridWeek,listWeek"
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
