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
  onEventClick: (eventId: string) => void;
}

const toLocalCalendarDate = (value: string | null | undefined) => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().replace(/\.\d{3}Z$/, "");
};

export function CalendarView({ events, onSelectRange, onEventClick }: CalendarViewProps) {
  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
        const isExternal = event.readonly || event.category === "External";
        const isCompleted = Boolean(event.completed);

        return {
          id: String(event.id),
          title: event.title,
          start: toLocalCalendarDate(event.start) ?? undefined,
          end: toLocalCalendarDate(event.end) ?? undefined,
          classNames: isExternal
            ? ["bg-gray-300", "opacity-70"]
            : isCompleted
              ? ["opacity-60"]
              : [],
          backgroundColor: isExternal
            ? "#d1d5db"
            : isCompleted
              ? "#22c55e"
              : undefined,
          editable: !isExternal,
        };
      }),
    [events]
  );

  const handleSelect = (selectionInfo: DateSelectArg) => {
    onSelectRange({
      start: new Date(selectionInfo.start.getTime()),
      end: new Date(selectionInfo.end.getTime())
    });
  };

  const handleEventClick = (info: EventClickArg) => {
    onEventClick(String(info.event.id));
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
