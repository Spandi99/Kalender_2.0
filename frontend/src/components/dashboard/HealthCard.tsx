import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Bug, ShieldCheck } from "lucide-react";

import type { SystemHealthStatus } from "../../api/client";
import { fetchSystemHealth, fetchSystemLogs } from "../../api/client";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

const STATUS_META = {
  ok: {
    label: "Stable",
    description: "System läuft stabil",
    tone: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-600",
    icon: ShieldCheck,
  },
  recovering: {
    label: "Recovering",
    description: "Self-Healing arbeitet",
    tone: "text-amber-600",
    badge: "bg-amber-100 text-amber-600",
    icon: Activity,
  },
  error: {
    label: "Error",
    description: "Manueller Check empfohlen",
    tone: "text-red-600",
    badge: "bg-red-100 text-red-600",
    icon: AlertTriangle,
  },
} satisfies Record<string, { label: string; description: string; tone: string; badge: string; icon: typeof ShieldCheck }>;

function resolveStatus(health?: SystemHealthStatus) {
  if (!health) {
    return STATUS_META.ok;
  }

  if (health.status === "error" || health.error) {
    return STATUS_META.error;
  }
  if (!health.self_healing_active) {
    return STATUS_META.recovering;
  }
  return STATUS_META.ok;
}

function formatTimestamp(value?: string | null) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-CH", { timeZone: "Europe/Zurich" });
}

export function HealthCard() {
  const [open, setOpen] = useState(false);

  const healthQuery = useQuery({
    queryKey: ["system", "health"],
    queryFn: fetchSystemHealth,
    refetchInterval: 60_000,
  });

  const logsQuery = useQuery({
    queryKey: ["system", "logs"],
    queryFn: fetchSystemLogs,
    refetchInterval: 60_000,
    enabled: open,
  });

  const statusMeta = resolveStatus(healthQuery.data);
  const StatusIcon = statusMeta.icon;

  return (
    <>
      <motion.div
        layout
        className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-lg transition hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/70"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">System Health</p>
            <h3 className="mt-1 text-2xl font-semibold">Self-Healing</h3>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusMeta.badge}`}>
            <StatusIcon className="h-4 w-4" />
            {statusMeta.label}
          </span>
        </div>

        {healthQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Diagnose wird geladen…</p>
        ) : healthQuery.isError ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/40 dark:text-red-200">
            <Bug className="h-5 w-5" />
            <span>Health-Endpunkt nicht erreichbar.</span>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Auto-Recovery: <span className="font-semibold">{healthQuery.data?.auto_recovery_enabled ? "Aktiv" : "Deaktiviert"}</span>
            </p>
            <p>
              Letzte Recovery-Aktion: <span className="font-semibold">{healthQuery.data?.last_recovery_action ?? "–"}</span>
            </p>
            <p>
              Logs: <span className="font-semibold">{healthQuery.data?.system_log_entries ?? 0}</span>
            </p>
            <p>
              Zuletzt erfolgreich geprüft: <span className="font-semibold">{formatTimestamp(healthQuery.data?.last_recovery_run)}</span>
            </p>
            <p>
              Self-Healing aktiv: <span className="font-semibold">{healthQuery.data?.self_healing_active ? "Ja" : "Nein"}</span>
            </p>
          </div>
        )}

        <Button className="mt-5 w-full" variant="outline" onClick={() => setOpen(true)}>
          Logs &amp; Details öffnen
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>System Logs &amp; Selbstheilung</DialogTitle>
          </DialogHeader>

          {logsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Lade Logeinträge…</p>
          ) : logsQuery.isError ? (
            <p className="text-sm text-red-500">Logs konnten nicht geladen werden.</p>
          ) : logsQuery.data?.length ? (
            <ul className="space-y-3 py-4">
              {logsQuery.data.map((log) => (
                <li key={log.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{new Date(log.timestamp).toLocaleString("de-CH", { timeZone: "Europe/Zurich" })}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {log.severity ?? "info"}
                    </span>
                  </div>
                  {log.component ? (
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{log.component}</p>
                  ) : null}
                  {log.message ? <p className="mt-2 text-slate-700 dark:text-slate-200">{log.message}</p> : null}
                  {log.action_taken ? (
                    <p className="mt-2 text-xs text-blue-500">Aktion: {log.action_taken}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">Status: {log.resolved ? "✅ Behoben" : "⏳ Offen"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-slate-500">Keine Logs vorhanden.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
