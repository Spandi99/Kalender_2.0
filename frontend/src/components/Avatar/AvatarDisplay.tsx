import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import { Progress } from "../ui/progress";

export interface AvatarDisplayProps {
  level: number;
  avatarState: string;
  expression: string;
  xpCurrent: number;
  xpNext?: number | null;
  xpPrevious?: number;
  levelProgress?: number;
  xpToNext?: number | null;
}

export function AvatarDisplay({
  level,
  avatarState,
  expression,
  xpCurrent,
  xpNext,
  xpPrevious,
  levelProgress,
  xpToNext,
}: AvatarDisplayProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const previousLevelRef = useRef(level);

  useEffect(() => {
    if (level > previousLevelRef.current) {
      setShowLevelUp(true);
      previousLevelRef.current = level;
      const timeout = setTimeout(() => setShowLevelUp(false), 2200);
      return () => clearTimeout(timeout);
    }
    previousLevelRef.current = level;
    return undefined;
  }, [level]);

  const cappedLevel = Math.max(1, Math.min(level, 5));
  const avatarSrc = useMemo(
    () => `/assets/avatars/level${cappedLevel}.svg`,
    [cappedLevel]
  );

  const progressValue = useMemo(() => {
    if (typeof levelProgress === "number") {
      return Math.round(Math.max(0, Math.min(1, levelProgress)) * 100);
    }
    if (xpNext != null && typeof xpPrevious === "number" && xpNext > xpPrevious) {
      return Math.round(
        Math.max(0, Math.min(1, (xpCurrent - xpPrevious) / (xpNext - xpPrevious))) * 100
      );
    }
    return 0;
  }, [levelProgress, xpCurrent, xpNext, xpPrevious]);

  const xpLabel = useMemo(() => {
    if (xpNext != null) {
      return `${xpCurrent} / ${xpNext} XP`;
    }
    return `${xpCurrent} XP`;
  }, [xpCurrent, xpNext]);

  const remainingLabel = useMemo(() => {
    if (xpToNext === null || xpToNext === undefined || xpNext === null || xpNext === undefined) {
      return "Max level achieved";
    }
    if (xpToNext <= 0) {
      return "Level up incoming";
    }
    return `${xpToNext} XP to next level`;
  }, [xpNext, xpToNext]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className={clsx(
                "absolute inset-0 rounded-full bg-brand-primary/30 blur-xl transition-opacity duration-700",
                showLevelUp ? "opacity-100" : "opacity-0"
              )}
            />
            <img
              src={avatarSrc}
              alt={`Avatar for level ${level}`}
              className={clsx(
                "relative h-20 w-20 rounded-full border-4 border-slate-900 object-cover shadow-lg transition-transform duration-700",
                showLevelUp ? "scale-110" : "scale-100"
              )}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-accent">Your avatar</div>
            <div className="text-2xl font-bold text-slate-100">Level {level}</div>
            <div className="text-sm capitalize text-slate-300">{avatarState}</div>
            <div className="text-sm text-slate-400">Mood: {expression}</div>
          </div>
        </div>
        <div className="flex min-w-[180px] flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
            <span>Progress</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2 bg-slate-800/80" />
          <div className="text-sm font-medium text-slate-200">{xpLabel}</div>
          <div className="text-xs text-slate-400">{remainingLabel}</div>
        </div>
      </div>
      {showLevelUp ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-indigo-600/90 px-6 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-lg">
            Level Up!
          </div>
        </div>
      ) : null}
    </div>
  );
}
