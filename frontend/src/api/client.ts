import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1"
});

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  category: string;
  completed: boolean;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  category: string;
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

export const fetchEvents = async (): Promise<CalendarEvent[]> => {
  const { data } = await api.get<CalendarEvent[]>("/calendar/");
  return data;
};

export const createEvent = async (payload: CreateEventPayload): Promise<CalendarEvent> => {
  const { data } = await api.post<CalendarEvent>("/calendar/", payload);
  return data;
};

export const completeEvent = async (eventId: number) => {
  const { data } = await api.post<{ event: CalendarEvent; xp_awarded: number }>(
    `/calendar/${eventId}/complete`
  );
  return data;
};

export const fetchXpTotals = async (): Promise<{ total: number; by_category: Record<string, number> }> => {
  const { data } = await api.get("/xp/");
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

export default api;
