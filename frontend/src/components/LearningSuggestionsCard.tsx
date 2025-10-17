import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  ApplyLearningSuggestionsPayload,
  ApplyLearningSuggestionsResponse,
  LearningSuggestion,
  LearningStats,
  fetchLearningSuggestions,
  applyLearningSuggestions,
} from "../api/client";
import { Button } from "./ui/button";

interface StatusState {
  type: "success" | "error";
  message: string;
}

type LoadOptions = {
  showEmptyMessage?: boolean;
};

function formatClusterTimes(stats: LearningStats | null): string {
  if (!stats || !stats.clusters.length) {
    return "–";
  }
  return stats.clusters.map((value) => formatHourFromFloat(value)).join(", ");
}

function formatHourFromFloat(value: number): string {
  const totalMinutes = Math.round(value * 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.abs(totalMinutes % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function formatDeltaMinutes(deltaMinutes: number): string {
  const absolute = Math.abs(deltaMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const parts: string[] = [];
  if (hours) {
    parts.push(`${hours}h`);
  }
  if (minutes) {
    parts.push(`${minutes}m`);
  }
  if (!parts.length) {
    parts.push("0m");
  }
  const prefix = deltaMinutes > 0 ? "+" : deltaMinutes < 0 ? "-" : "±";
  return `${prefix}${parts.join(" ")}`;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "–";
  }
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

export function LearningSuggestionsCard() {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<LearningSuggestion[]>([]);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!status) {
      return;
    }
    const timeout = setTimeout(() => setStatus(null), status.type === "error" ? 6000 : 4000);
    return () => clearTimeout(timeout);
  }, [status]);

  const loadSuggestions = async (options: LoadOptions = {}) => {
    setIsLoading(true);
    try {
      const data = await fetchLearningSuggestions();
      setSuggestions(data.suggestions);
      setStats(data.stats ?? null);
      setSelectedIds([]);
      if (options.showEmptyMessage && !data.suggestions.length) {
        setStatus({
          type: "success",
          message: "Alle Tagesvorlagen passen bereits zu deinen produktiven Zeiten.",
        });
      } else if (!options.showEmptyMessage && !applyMutation.isPending && !data.suggestions.length) {
        setStatus(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vorschläge konnten nicht geladen werden.";
      setStatus({ type: "error", message });
    } finally {
      setIsLoading(false);
    }
  };

  const applyMutation = useMutation({
    mutationFn: (payload: ApplyLearningSuggestionsPayload) => applyLearningSuggestions(payload),
    onSuccess: async (response: ApplyLearningSuggestionsResponse) => {
      await loadSuggestions();
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["day-templates"] });
      if (response.applied > 0) {
        setStatus({
          type: "success",
          message:
            response.applied === 1
              ? "Eine Vorlage wurde optimiert."
              : `${response.applied} Vorlagen wurden optimiert.`,
        });
      } else {
        setStatus({ type: "error", message: "Keine der ausgewählten Blöcke konnte angepasst werden." });
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Änderungen konnten nicht übernommen werden.";
      setStatus({ type: "error", message });
    },
  });

  const handleGenerate = () => {
    setStatus(null);
    void loadSuggestions({ showEmptyMessage: true });
  };

  const toggleSelection = (blockId: number, checked: boolean) => {
    setSelectedIds((previous) => {
      if (checked) {
        if (previous.includes(blockId)) {
          return previous;
        }
        return [...previous, blockId];
      }
      return previous.filter((id) => id !== blockId);
    });
  };

  const handleApply = () => {
    if (!selectedIds.length || applyMutation.isPending) {
      return;
    }
    const payload: ApplyLearningSuggestionsPayload = { block_ids: selectedIds };
    applyMutation.mutate(payload);
  };

  const disableActions = isLoading || applyMutation.isPending;
  const clusterTimes = formatClusterTimes(stats);
  const updatedAt = stats?.snapshot_created_at ?? null;

  return (
    <div className="space-y-4 text-gray-700 dark:text-gray-300">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">AI Optimization Suggestions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Lernt aus abgeschlossenen Events, XP und Feedback.
          </p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={disableActions}>
          {isLoading ? "Analysiere…" : "Vorschläge erzeugen"}
        </Button>
      </div>

      {stats ? (
        <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/60 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Produktive Cluster</p>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{clusterTimes}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ø Stimmung</p>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {stats.average_mood != null ? stats.average_mood.toFixed(1) : "–"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Letzte Analyse</p>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{formatTimestamp(updatedAt)}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Noch keine Analyse durchgeführt. Starte die KI, um Vorschläge zu erhalten.
        </p>
      )}

      {status ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <div className="space-y-3">
        {suggestions.length ? (
          suggestions.map((suggestion) => (
            <label
              key={suggestion.block_id}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-indigo-500"
            >
              <div className="space-y-2">
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{suggestion.block_label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatHourFromFloat(suggestion.suggested_start)} – {formatHourFromFloat(suggestion.suggested_end)}
                </p>
                <p className="text-xs uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                  Abweichung: {formatDeltaMinutes(suggestion.delta_minutes)}
                </p>
              </div>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900"
                checked={selectedIds.includes(suggestion.block_id)}
                onChange={(event) => toggleSelection(suggestion.block_id, event.target.checked)}
              />
            </label>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
            Keine Vorschläge verfügbar. Starte die Analyse oder passe Templates manuell an.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Wähle Blöcke aus, um KI-Anpassungen direkt auf deine Templates anzuwenden.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>
            Auswahl löschen
          </Button>
          <Button size="sm" onClick={handleApply} disabled={!selectedIds.length || applyMutation.isPending}>
            {applyMutation.isPending ? "Übernehme…" : "Auswahl anwenden"}
          </Button>
        </div>
      </div>
    </div>
  );
}
