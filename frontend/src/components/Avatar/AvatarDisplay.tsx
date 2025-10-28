import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import { DynamicAvatar } from "./DynamicAvatar";
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
      const timeout = setTimeout(() => setShowLevelUp(false), 2000);
      return () => clearTimeout(timeout);
    }
    previousLevelRef.current = level;
    return undefined;
  }, [level]);

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
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg transition",
        showLevelUp && "border-emerald-400/70 shadow-[0_0_35px_rgba(74,222,128,0.25)]"
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 sm:gap-5">
          <DynamicAvatar
            level={level}
            animated
            variant="full"
            className="h-28 w-28 sm:h-36 sm:w-36"
            ariaLabel={`Avatar level ${level}`}
          />
          <div className="min-w-0 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-accent">Dein Avatar</div>
            <div className="text-3xl font-bold text-slate-100 transition-transform duration-700">
              Level {level}
            </div>
            <div className="text-sm capitalize text-slate-300 break-words">{avatarState.replace(/_/g, " ")}</div>
            <div className="text-sm text-slate-400">Stimmung: {expression}</div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:min-w-[220px]">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>Fortschritt</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2 bg-slate-800/80" />
          <div className="text-sm font-medium text-slate-200">{xpLabel}</div>
          <div className="text-xs text-slate-400">{remainingLabel}</div>
        </div>
      </div>
      {showLevelUp ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-emerald-500/90 px-6 py-2 text-sm font-bold uppercase tracking-wide text-slate-950 shadow-lg animate-levelup-badge">
            Level Up!
          </div>
        </div>
      ) : null}
    </div>
  );
}
