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
}

const toLocalCalendarDate = (value: string) => {
  if (!value) {
    return value;
  }
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, "");
};

export function CalendarView({ events, onSelectRange, onEventClick }: CalendarViewProps) {
  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: String(event.id),
        title: event.title,
        start: toLocalCalendarDate(event.start),
        end: toLocalCalendarDate(event.end),
        classNames: event.completed ? ["opacity-60"] : [],
        backgroundColor: event.completed ? "#22c55e" : undefined
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
    <div className="h-full rounded-lg border bg-white p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        timeZone="local"
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
        height="100%"
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
      />
    </div>
  );
}
