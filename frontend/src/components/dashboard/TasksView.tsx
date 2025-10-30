import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock4,
  Loader2,
  PenSquare,
  RefreshCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  CreateTaskPayload,
  EventCategory,
  OptimalTaskTimeResponse,
  ScheduleTasksResponse,
  Task,
  TaskEventLink,
  TaskStats,
  createTask,
  deleteTask,
  fetchEventCategories,
  fetchOptimalTaskTime,
  fetchTaskStats,
  fetchTasks,
  scheduleTasks,
  updateTask,
} from "../../api/client";
import { ColorPicker } from "../ui/color-picker";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const EVENT_QUERY_KEYS: Array<readonly unknown[]> = [
  ["events"],
  ["events", "dashboard"],
  ["events", "overview"],
  ["events", "next-widget"],
];

const PRIORITY_OPTIONS = [
  { label: "High", value: "high" as const },
  { label: "Medium", value: "medium" as const },
  { label: "Low", value: "low" as const },
];

const PREFERRED_TIME_OPTIONS = [
  { label: "Morning", value: "morning" as const },
  { label: "Afternoon", value: "afternoon" as const },
  { label: "Evening", value: "evening" as const },
];

const INTERVAL_UNITS = [
  { label: "Days", value: "day" as const },
  { label: "Weeks", value: "week" as const },
  { label: "Months", value: "month" as const },
];

interface TaskFormState {
  title: string;
  description: string;
  priority: Task["priority"];
  preferred_time: Task["preferred_time"];
  interval_value: number;
  interval_unit: Task["interval_unit"];
  duration_minutes: number;
  color: string | null;
  category: string;
}

type StatusBanner = { type: "info" | "error"; message: string } | null;

const DEFAULT_FORM: TaskFormState = {
  title: "",
  description: "",
  priority: "medium",
  preferred_time: "morning",
  interval_value: 1,
  interval_unit: "week",
  duration_minutes: 60,
  color: null,
  category: "",
};

function formatPreferredTime(value: Task["preferred_time"]) {
  if (!value) {
    return null;
  }
  switch (value) {
    case "morning":
      return "Morning";
    case "afternoon":
      return "Afternoon";
    case "evening":
      return "Evening";
    default:
      return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function resolveUpcomingEvent(events: TaskEventLink[]): TaskEventLink | null {
  const now = Date.now();
  return (
    events
      .filter((entry) => new Date(entry.scheduled_for).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0] ?? null
  );
}

function describeProductiveHours(hours: number[]) {
  if (!hours.length) {
    return null;
  }
  const ranked = hours
    .map((count, index) => ({ count, hour: index }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  if (!ranked.length) {
    return null;
  }

  const top = ranked.slice(0, 3);
  return top
    .map((item) => `${item.hour.toString().padStart(2, "0")}:00 (${item.count})`)
    .join(", ");
}

export default function TasksView() {
  const queryClient = useQueryClient();
  const locale =
    typeof navigator !== "undefined" && navigator.language ? navigator.language : "de-CH";

  const [formState, setFormState] = useState<TaskFormState>(DEFAULT_FORM);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [status, setStatus] = useState<StatusBanner>(null);
  const [scheduleResult, setScheduleResult] = useState<ScheduleTasksResponse | null>(null);
  const [optimalTime, setOptimalTime] = useState<OptimalTaskTimeResponse | null>(null);

  useEffect(() => {
    if (!status) {
      return;
    }
    const timer = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [status]);

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const statsQuery = useQuery({
    queryKey: ["tasks", "stats"],
    queryFn: fetchTaskStats,
  });

  const categoriesQuery = useQuery({
    queryKey: ["event-categories"],
    queryFn: fetchEventCategories,
  });

  const tasks = tasksQuery.data ?? [];
  const stats = statsQuery.data;
  const categories = categoriesQuery.data ?? [];

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const aDue = a.next_due ? new Date(a.next_due).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.next_due ? new Date(b.next_due).getTime() : Number.POSITIVE_INFINITY;
        return aDue - bDue;
      }),
    [tasks]
  );

  const resetForm = () => {
    setFormState(DEFAULT_FORM);
    setEditingTask(null);
  };

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["tasks", "stats"] });
  };

  const invalidateEvents = () => {
    EVENT_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (task) => {
      invalidateTasks();
      setStatus({ type: "info", message: `Task "${task.title}" angelegt.` });
      resetForm();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Task konnte nicht angelegt werden.";
      setStatus({ type: "error", message });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: Partial<CreateTaskPayload> }) =>
      updateTask(taskId, payload),
    onSuccess: (task) => {
      invalidateTasks();
      setStatus({ type: "info", message: `Task "${task.title}" aktualisiert.` });
      resetForm();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Task konnte nicht aktualisiert werden.";
      setStatus({ type: "error", message });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      invalidateTasks();
      setStatus({ type: "info", message: "Task gelöscht." });
      resetForm();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Task konnte nicht gelöscht werden.";
      setStatus({ type: "error", message });
    },
  });

  const scheduleTasksMutation = useMutation({
    mutationFn: scheduleTasks,
    onSuccess: (result) => {
      setScheduleResult(result);
      invalidateTasks();
      invalidateEvents();
      setStatus({
        type: "info",
        message: result.scheduled
          ? `${result.scheduled} Task(s) im Kalender eingeplant.`
          : "Keine Tasks eingeplant. Vielleicht sind alle gut versorgt?",
      });
    },
    onError: (error: unknown) => {
      setScheduleResult(null);
      const message =
        error instanceof Error ? error.message : "Tasks konnten nicht geplant werden.";
      setStatus({ type: "error", message });
    },
  });

  const optimalTimeMutation = useMutation({
    mutationFn: (category: string | null) => fetchOptimalTaskTime(category ?? undefined),
    onSuccess: (data) => {
      setOptimalTime(data);
    },
    onError: () => {
      setOptimalTime(null);
    },
  });

  const handleSubmitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      setStatus({ type: "error", message: "Bitte gib dem Task einen Titel." });
      return;
    }

    const payload: CreateTaskPayload = {
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      priority: formState.priority,
      preferred_time: formState.preferred_time ?? null,
      interval_value: formState.interval_value,
      interval_unit: formState.interval_unit,
      duration_minutes: formState.duration_minutes,
      color: formState.color ?? null,
      category: formState.category || null,
    };

    if (editingTask) {
      updateTaskMutation.mutate({ taskId: editingTask.id, payload });
    } else {
      createTaskMutation.mutate(payload);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormState({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      preferred_time: task.preferred_time ?? null,
      interval_value: task.interval_value,
      interval_unit: task.interval_unit,
      duration_minutes: task.duration_minutes,
      color: task.color,
      category: task.category ?? "",
    });
  };

  const handleToggleCompleted = (task: Task) => {
    updateTaskMutation.mutate({
      taskId: task.id,
      payload: {
        completed: !task.completed,
      },
    });
  };

  const handleDeleteTask = (taskId: number) => {
    if (deleteTaskMutation.isPending) {
      return;
    }
    if (confirm("Soll dieser Task wirklich gelöscht werden?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const busy =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    scheduleTasksMutation.isPending;

  return (
    <div className="space-y-6 text-slate-100">
      <Card className="border border-slate-700/70 bg-slate-900/85 shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-emerald-200">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span>Tasks</span>
          </div>
          <CardTitle className="text-3xl font-bold text-white">Gewohnheiten & Fokustasks</CardTitle>
          <p className="text-sm text-slate-300">
            Erstelle wiederkehrende Tasks, lass sie automatisch planen und nutze KI-Insights, um
            deine produktivsten Zeitfenster zu finden.
          </p>
        </CardHeader>
      </Card>

      {status ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm shadow-inner ${
            status.type === "error"
              ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
              : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card className="border border-slate-700/70 bg-slate-900/80 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Task konfigurieren</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmitTask}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Titel</Label>
                  <Input
                    id="task-title"
                    value={formState.title}
                    onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Weekly Review"
                    className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-category">Kategorie</Label>
                  <select
                    id="task-category"
                    value={formState.category}
                    onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="">Standard (Work)</option>
                    {categories.map((category: EventCategory) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Beschreibung</Label>
                <Textarea
                  id="task-description"
                  value={formState.description}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Was steht an? Welche Schritte brauchst du?"
                  className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Priorität</Label>
                  <select
                    id="task-priority"
                    value={formState.priority}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, priority: event.target.value as Task["priority"] }))
                    }
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-preferred">Tageszeit</Label>
                  <select
                    id="task-preferred"
                    value={formState.preferred_time ?? ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        preferred_time: event.target.value ? (event.target.value as Task["preferred_time"]) : null,
                      }))
                    }
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="">Keine Präferenz</option>
                    {PREFERRED_TIME_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Dauer (Minuten)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={formState.duration_minutes}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        duration_minutes: Number.parseInt(event.target.value, 10) || 60,
                      }))
                    }
                    className="border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
                <div className="space-y-2">
                  <Label htmlFor="task-interval-value">Alle</Label>
                  <Input
                    id="task-interval-value"
                    type="number"
                    min={1}
                    max={30}
                    value={formState.interval_value}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        interval_value: Number.parseInt(event.target.value, 10) || 1,
                      }))
                    }
                    className="border-slate-700 bg-slate-900 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-interval-unit">
                    Intervall
                  </Label>
                  <select
                    id="task-interval-unit"
                    value={formState.interval_unit}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        interval_unit: event.target.value as Task["interval_unit"],
                      }))
                    }
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {INTERVAL_UNITS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Farbe</Label>
                  <ColorPicker
                    value={formState.color}
                    onChange={(value) => setFormState((prev) => ({ ...prev, color: value }))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {editingTask ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="border border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80"
                    onClick={resetForm}
                  >
                    Abbrechen
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-500"
                  disabled={busy}
                >
                  {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Speichere…
                    </span>
                  ) : editingTask ? (
                    "Task aktualisieren"
                  ) : (
                    "Task anlegen"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border border-slate-700/70 bg-slate-900/80 shadow-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg font-semibold text-white">Überblick</CardTitle>
              <p className="text-sm text-slate-300">
                Automatisierte Planung dank Feedback-Insights. Lass Tasks zur richtigen Zeit erscheinen.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        Gesamt
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.total_tasks}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CalendarClock className="h-5 w-5 text-blue-400" aria-hidden />
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        Überfällig
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.overdue_tasks}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock4 className="h-5 w-5 text-amber-400" aria-hidden />
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        Nächste Woche
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.upcoming_tasks}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Sparkles className="h-5 w-5 text-purple-400" aria-hidden />
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        Geplant
                      </span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-white">{stats.scheduled_events}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Noch keine Statistiken verfügbar.</p>
              )}

              {stats?.productive_hours ? (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-slate-200">Produktive Zeitfenster</p>
                  <p className="mt-1 text-slate-400">
                    {describeProductiveHours(stats.productive_hours) ?? "Noch keine Daten gesammelt."}
                  </p>
                </div>
              ) : null}

              {scheduleResult ? (
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                  <p className="font-semibold">
                    {scheduleResult.scheduled} Task(s) geplant, {scheduleResult.skipped} übersprungen.
                  </p>
                  {scheduleResult.entries.length ? (
                    <ul className="mt-2 space-y-1">
                      {scheduleResult.entries.slice(0, 4).map((entry) => (
                        <li key={`${entry.task_id}-${entry.event_id}`}>
                          {entry.title} •{" "}
                          {formatDateTime(entry.start, locale) ?? entry.start}
                        </li>
                      ))}
                      {scheduleResult.entries.length > 4 ? (
                        <li className="text-xs text-blue-200/80">
                          …und {scheduleResult.entries.length - 4} weitere.
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {optimalTime ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <p className="font-semibold">Optimales Zeitfenster</p>
                  <p className="mt-1">
                    Für {optimalTime.category ?? "alle Kategorien"} empfehlen wir{" "}
                    {optimalTime.optimal_time ?? "flexible Planung"}.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-emerald-600 text-white hover:bg-emerald-500"
                  onClick={() => scheduleTasksMutation.mutate()}
                  disabled={scheduleTasksMutation.isPending || tasksQuery.isLoading || !tasks.length}
                >
                  {scheduleTasksMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Plane…
                    </span>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                      Tasks automatisch planen
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="border border-slate-600 bg-slate-900/70 text-slate-100 hover:bg-slate-800/80"
                  onClick={() => optimalTimeMutation.mutate(formState.category || null)}
                  disabled={optimalTimeMutation.isPending}
                >
                  {optimalTimeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <CalendarClock className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Bestes Zeitfenster
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border border-slate-700/70 bg-slate-950/85 shadow-2xl">
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-400" aria-hidden />
            Aktive Tasks
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            className="text-sm text-slate-300 hover:text-white"
            onClick={() => tasksQuery.refetch()}
            disabled={tasksQuery.isFetching}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${tasksQuery.isFetching ? "animate-spin" : ""}`} aria-hidden />
            Aktualisieren
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {tasksQuery.isLoading ? (
            <div className="flex items-center gap-3 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Tasks werden geladen…
            </div>
          ) : sortedTasks.length === 0 ? (
            <p className="text-sm text-slate-400">
              Noch keine Tasks erfasst. Starte oben mit deinem ersten Task.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedTasks.map((task) => {
                const nextEvent = resolveUpcomingEvent(task.events ?? []);
                const probabilityPercent = Math.round(task.completion_probability * 100);
                const isCompleted = task.completed;
                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl border px-4 py-4 transition ${
                      isCompleted
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-900/70 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-3 w-3 rounded-full border border-white/40" style={{ backgroundColor: task.color ?? "#64748b" }} aria-hidden />
                          <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              task.priority === "high"
                                ? "bg-rose-500/20 text-rose-200"
                                : task.priority === "medium"
                                ? "bg-amber-500/20 text-amber-200"
                                : "bg-sky-500/20 text-sky-200"
                            }`}
                          >
                            {task.priority.toUpperCase()}
                          </span>
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-100">
                              <CheckCircle2 className="h-3 w-3" aria-hidden />
                              Abgeschlossen
                            </span>
                          ) : null}
                        </div>
                        {task.description ? (
                          <p className="text-sm text-slate-300">{task.description}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>
                            Rhythmus: alle {task.interval_value} {task.interval_unit === "day" ? "Tag(e)" : task.interval_unit === "week" ? "Woche(n)" : "Monat(e)"}
                          </span>
                          <span>Dauer: {task.duration_minutes} Min</span>
                          {task.preferred_time ? <span>Bevorzugt: {formatPreferredTime(task.preferred_time)}</span> : null}
                          <span>Erfolgswahrscheinlichkeit: {probabilityPercent}%</span>
                        </div>
                        <div className="text-xs text-slate-400/90">
                          Nächste Fälligkeit:{" "}
                          {formatDateTime(task.next_due, locale) ?? "Noch nicht geplant"}
                        </div>
                        {nextEvent ? (
                          <div className="text-xs text-slate-300">
                            Nächster Kalender-Slot: {formatDateTime(nextEvent.scheduled_for, locale)}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-500"
                          onClick={() => handleToggleCompleted(task)}
                          disabled={updateTaskMutation.isPending}
                        >
                          {isCompleted ? (
                            <>
                              <ChevronDown className="mr-2 h-4 w-4" aria-hidden />
                              Reaktivieren
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" aria-hidden />
                              Erledigt
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="bg-slate-800 text-slate-100 hover:bg-slate-700"
                          onClick={() => handleEditTask(task)}
                          disabled={busy}
                        >
                          <PenSquare className="mr-2 h-4 w-4" aria-hidden />
                          Bearbeiten
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="bg-rose-600/90 text-slate-50 hover:bg-rose-500"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={deleteTaskMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                          Löschen
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
