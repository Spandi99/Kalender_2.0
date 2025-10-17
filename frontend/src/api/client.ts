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

  const hostname = window.location.hostname;
  if (hostname.includes("orgalifer.ch")) {
    return "/api";
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

export interface AdaptiveAnalysis {
  avg_completion_rate: number;
  avg_mood: number;
  productive_hours: number[];
  discipline_streaks: Record<string, number>;
}

export interface AdaptiveResponse {
  status: string;
  analysis: AdaptiveAnalysis;
}

export interface LearningStats {
  clusters: number[];
  average_mood: number | null;
  average_xp: number | null;
  total_events: number;
  feedback_samples: number;
  xp_samples: number;
  snapshot_id: number | null;
  snapshot_created_at: string | null;
}

export interface LearningSuggestion {
  block_id: number;
  template_id: number;
  block_label: string;
  current_start: string;
  current_end: string;
  suggested_start: string;
  suggested_end: string;
  delta_minutes: number;
  reason: string;
}

export interface LearningSuggestionsResponse {
  stats: LearningStats | null;
  suggestions: LearningSuggestion[];
}

export interface ApplyLearningSuggestionsPayload {
  block_ids: number[];
}

export interface AppliedLearningSuggestion {
  block_id: number;
  template_id: number;
  block_label: string;
  previous_start: string;
  previous_end: string;
  new_start: string;
  new_end: string;
  delta_minutes: number;
  reason: string;
}

export interface ApplyLearningSuggestionsResponse {
  applied: number;
  updated_blocks: AppliedLearningSuggestion[];
  stats: LearningStats | null;
}

export interface AIRecommendation {
  title: string;
  description: string;
  category?: string | null;
  priority: "low" | "medium" | "high";
}

export interface AIInsightsResponse {
  total_events: number;
  completed_events: number;
  completion_rate: number;
  punctuality_stats: Record<string, number>;
  frequent_reasons: Record<string, number>;
  average_rating: number | null;
  recommendations: AIRecommendation[];
  summary?: string;
}

export interface SystemHealthStatus {
  status: string;
  database_connected: boolean;
  auto_recovery_enabled: boolean;
  last_recovery_run: string | null;
  self_healing_active: boolean;
  last_recovery_action: string | null;
  last_recovery_timestamp?: string | null;
  system_log_entries: number;
  error?: string;
}

export interface SystemLogEntry {
  id: number;
  timestamp: string;
  component: string | null;
  severity: string | null;
  message: string | null;
  action_taken: string | null;
  resolved: boolean;
}

export const fetchEvents = async (): Promise<CalendarEvent[]> => {
  const { data } = await api.get<CalendarEvent[]>("/events/");
  return data;
};

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
