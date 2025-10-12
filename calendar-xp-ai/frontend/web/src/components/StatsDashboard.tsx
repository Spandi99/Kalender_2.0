import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import apiClient from "../api/client";

interface XPMilestone {
  level: number;
  required_xp: number;
  reward: string;
}

interface XPProgress {
  current_xp: number;
  current_level: number;
  milestones: XPMilestone[];
}

const StatsDashboard = () => {
  const [progress, setProgress] = useState<XPProgress | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      const response = await apiClient.get<XPProgress>("/xp/progress");
      setProgress(response.data);
    };

    fetchProgress();
  }, []);

  if (!progress) {
    return <div className="text-sm text-slate-400">Loading XP progress…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Current Level</h3>
        <p className="text-3xl font-bold text-emerald-400">Level {progress.current_level}</p>
        <p className="text-xs text-slate-400">{progress.current_xp} XP earned</p>
      </div>
      <div className="h-64 rounded-lg border border-slate-800 bg-slate-950/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={progress.milestones}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="level" stroke="#94a3b8" tickLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(30, 41, 59, 0.4)" }} />
            <Bar dataKey="required_xp" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsDashboard;
