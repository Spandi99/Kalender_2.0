import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://192.168.1.136:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  category: string;
  completed: boolean;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  start: string;
  end: string;
  category: string;
}

export interface UpdateEventPayload extends Partial<CreateEventPayload> {
  completed?: boolean;
}

export interface EventCategory {
  slug: string;
  name: string;
  xp_value: number;
}

export interface FeedbackPayload {
  event_id: number;
  rating: number;
  mood: string;
  notes?: string;
}

export interface FeedbackSummary {
  average_rating: number;
  mood_counts: Record<string, number>;
  total_feedback: number;
}

export interface XpSummary {
  total: number;
  by_category: Record<string, number>;
}

export interface LevelStatus {
  current_level: number;
  xp_current: number;
  xp_previous: number;
  xp_next: number | null;
  progress: number;
  avatar_state: string;
  expression: string;
}

export const fetchEvents = async (): Promise<CalendarEvent[]> => {
  const { data } = await api.get<CalendarEvent[]>("/events/");
  return data;
};

export const createEvent = async (payload: CreateEventPayload): Promise<CalendarEvent> => {
  const { data } = await api.post<CalendarEvent>("/events/", payload);
  return data;
};

export const updateEvent = async (eventId: number, payload: UpdateEventPayload): Promise<CalendarEvent> => {
  const { data } = await api.put<CalendarEvent>(`/events/${eventId}`, payload);
  return data;
};

export const deleteEvent = async (eventId: number): Promise<void> => {
  await api.delete(`/events/${eventId}`);
};

export const completeEvent = async (eventId: number) => {
  const { data } = await api.post<{ event: CalendarEvent; xp_awarded: number }>(
    `/events/${eventId}/complete`
  );
  return data;
};

export const fetchXpSummary = async (): Promise<XpSummary> => {
  const { data } = await api.get<XpSummary>("/xp/summary");
  return data;
};

export const fetchLevelStatus = async (): Promise<LevelStatus> => {
  const { data } = await api.get<LevelStatus>("/xp/level");
  return data;
};

export const submitFeedback = async (payload: FeedbackPayload) => {
  const { data } = await api.post("/feedback/", payload);
  return data;
};

export const fetchFeedbackSummary = async (): Promise<FeedbackSummary> => {
  const { data } = await api.get<FeedbackSummary>("/feedback/summary");
  return data;
};

export const fetchEventCategories = async (): Promise<EventCategory[]> => {
  const { data } = await api.get<EventCategory[]>("/events/categories");
  return data;
};

export default api;
