import { useCallback, useEffect, useState } from "react";
import FullCalendar, { DateSelectArg, EventDropArg, EventInput } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "@fullcalendar/common/main.css";
import "@fullcalendar/daygrid/main.css";

import apiClient from "../api/client";

const CalendarView = () => {
  const [events, setEvents] = useState<EventInput[]>([]);

  const loadEvents = useCallback(async () => {
    const response = await apiClient.get("/calendar/events");
    setEvents(response.data);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSelect = useCallback(
    async (selection: DateSelectArg) => {
      const { start, end } = selection;
      const newEvent = {
        title: "New Event",
        start,
        end,
        allDay: selection.allDay,
      };

      const response = await apiClient.post("/calendar/events", newEvent);
      setEvents((prev) => [...prev, response.data]);
    },
    []
  );

  const handleEventDrop = useCallback(
    async (eventDropInfo: EventDropArg) => {
      const { event } = eventDropInfo;
      // Optimistic update until backend supports persistence.
      setEvents((prev) =>
        prev.map((item) =>
          String(item.id) === String(event.id)
            ? {
                ...item,
                start: event.start?.toISOString(),
                end: event.end?.toISOString(),
              }
            : item
        )
      );
    },
    []
  );

  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      selectable
      editable
      select={handleSelect}
      eventDrop={handleEventDrop}
      height="auto"
      headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,dayGridWeek" }}
    />
  );
};

export default CalendarView;
