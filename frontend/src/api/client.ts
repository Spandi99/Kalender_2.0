import axios from "axios";

declare module "axios" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface AxiosRequestConfig {
    _retryWithFallback?: boolean;
  }
}

const resolveBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:8000/api";
  }

  const origin = window.location.origin.replace(/\/$/, "");
  if (origin.includes("orgalifer.ch")) {
    return `${origin}/api`;
  }

  return "http://localhost:8000/api";
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      error?.code === "ERR_NETWORK" &&
      !error.config?._retryWithFallback &&
      typeof window !== "undefined"
    ) {
      const fallbackUrl = resolveBaseUrl();
      if (api.defaults.baseURL !== fallbackUrl) {
        api.defaults.baseURL = fallbackUrl;
        if (error.config) {
          error.config._retryWithFallback = true;
          return api.request(error.config);
        }
      }
    }
    return Promise.reject(error);
  }
);

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  start: string;
  end: string;
  category: string;
  completed: boolean;
}

export interface ImportedCalendar {
  id: number;
  name: string;
  url: string;
  last_synced: string | null;
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
  reason: FeedbackReason;
  punctuality: FeedbackPunctuality;
  event_id?: number;
  additional_notes?: string;
}

export interface FeedbackSummary {
  total_feedback: number;
  punctuality_breakdown: Record<FeedbackPunctuality, number>;
  reasons_breakdown: Record<FeedbackReason, number>;
}

export interface XpSummary {
  total_xp: number;
  weekly_xp: number;
  level: number;
}

export interface LevelStatus {
  current_level: number;
  next_level_xp: number;
  current_xp: number;
}

export interface SystemHealthStatus {
  status: string;
  database_connected: boolean;
  auto_recovery_enabled: boolean;
  last_recovery_run: string | null;
  component_status: Record<string, string>;
}

export interface SystemLogEntry {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown> | null;
}

export interface AdaptiveResponse {
  status: string;
  summary: string;
  recommendations: string[];
}

export interface AIInsightsResponse {
  summary: string;
  recommendations: string[];
}

export interface LearningSuggestionsResponse {
  suggestions: string[];
}

export interface ApplyLearningSuggestionsPayload {
  suggestions: string[];
}

export interface ApplyLearningSuggestionsResponse {
  status: string;
}

export const createEvent = async (payload: CreateEventPayload): Promise<CalendarEvent> => {
  const { data } = await api.post<CalendarEvent>("/events/", payload);
  return data;
};

export const updateEvent = async (
  eventId: number,
  payload: UpdateEventPayload
): Promise<CalendarEvent> => {
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

export const runAdaptiveAnalysis = async (): Promise<AdaptiveResponse> => {
  const { data } = await api.post<AdaptiveResponse>("/adaptive/analyze");
  return data;
};

export const fetchImportedCalendars = async (): Promise<ImportedCalendar[]> => {
  const { data } = await api.get<ImportedCalendar[]>("/ical/");
  return data;
};

export const addICalCalendar = async (name: string, url: string): Promise<ImportedCalendar> => {
  const { data } = await api.post<ImportedCalendar>("/ical/import", { name, url });
  return data;
};

export const syncICalCalendar = async (
  id: number,
): Promise<{ status: string; last_synced: string | null }> => {
  const { data } = await api.post<{ status: string; last_synced: string | null }>(`/ical/sync/${id}`);
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

export const fetchLearningSuggestions = async (): Promise<LearningSuggestionsResponse> => {
  const { data } = await api.get<LearningSuggestionsResponse>("/learning/suggestions");
  return data;
};

export const applyLearningSuggestions = async (
  payload: ApplyLearningSuggestionsPayload
): Promise<ApplyLearningSuggestionsResponse> => {
  const { data } = await api.post<ApplyLearningSuggestionsResponse>("/learning/apply", payload);
  return data;
};

export const fetchSystemHealth = async (): Promise<SystemHealthStatus> => {
  const { data } = await api.get<SystemHealthStatus>("/health/extended");
  return data;
};

export const fetchSystemLogs = async (): Promise<SystemLogEntry[]> => {
  const { data } = await api.get<SystemLogEntry[]>("/system/logs");
  return data;
};

export default api;
