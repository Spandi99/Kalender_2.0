import { useMemo } from "react";

import CalendarView from "./components/CalendarView";
import FeedbackDialog from "./components/FeedbackDialog";
import StatsDashboard from "./components/StatsDashboard";
import { Button } from "./components/ui/button";
import "./index.css";

function App() {
  const title = useMemo(() => "AI Calendar XP", []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-slate-400">
              Gamified planning with AI-assisted scheduling.
            </p>
          </div>
          <FeedbackDialog>
            <Button variant="accent">Share Feedback</Button>
          </FeedbackDialog>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-5">
        <section className="md:col-span-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg shadow-slate-950/40">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Schedule</h2>
            <CalendarView />
          </div>
        </section>
        <section className="md:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg shadow-slate-950/40">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">XP Dashboard</h2>
            <StatsDashboard />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
