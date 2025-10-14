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

export interface TemplateBlockInput {
  label: string;
  start_time: string;
  end_time: string;
  category?: string;
}

export interface TemplateBlock extends TemplateBlockInput {
  id: number;
}

export interface DayTemplate {
  id: number;
  name: string;
  description?: string | null;
  blocks: TemplateBlock[];
}

export interface CreateDayTemplatePayload {
  name: string;
  description?: string;
  blocks: TemplateBlockInput[];
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

export type FeedbackReason = "too_tired" | "no_time" | "forgot" | "low_motivation" | "other";
export type FeedbackPunctuality = "on_time" | "late" | "early";

export interface FeedbackPayload {
  event_id: number;
  completed: boolean;
  rating: number | null;
  mood: string | null;
  reason?: FeedbackReason | null;
  punctuality?: FeedbackPunctuality | null;
  arrival_delay_minutes?: number | null;
  duration_variance_minutes?: number | null;
  notes?: string | null;
}

export interface FeedbackSummary {
  average_rating: number;
  mood_counts: Record<string, number>;
  total_feedback: number;
  completion_rate: number;
  punctuality_distribution: Record<string, number>;
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

export interface AIRecommendation {
  title: string;
  description: string;
  category?: string | null;
  priority: 'low' | 'medium' | 'high';
}

export interface AIInsightsResponse {
  total_events: number;
  completed_events: number;
  completion_rate: number;
  punctuality_stats: Record<string, number>;
  frequent_reasons: Record<string, number>;
  average_rating: number | null;
  recommendations: AIRecommendation[];
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

export const fetchAiInsights = async (): Promise<AIInsightsResponse> => {
  const { data } = await api.get<AIInsightsResponse>("/ai/insights");
  return data;
};

export const fetchTemplates = async (): Promise<DayTemplate[]> => {
  const { data } = await api.get<DayTemplate[]>("/templates/");
  return data;
};

export const createTemplate = async (
  payload: CreateDayTemplatePayload
): Promise<DayTemplate> => {
  const { data } = await api.post<DayTemplate>("/templates/", payload);
  return data;
};

export const deleteTemplate = async (templateId: number): Promise<void> => {
  await api.delete(`/templates/${templateId}`);
};

export const applyTemplate = async (
  templateId: number,
  date: string
): Promise<CalendarEvent[]> => {
  const { data } = await api.post<CalendarEvent[]>(
    `/templates/${templateId}/apply`,
    null,
    { params: { date } }
  );
  return data;
};

export default api;
