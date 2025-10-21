import { Plus } from "lucide-react";

import { AvatarStatus } from "../lib/useAvatar";
import { DynamicAvatar } from "./Avatar/DynamicAvatar";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";

interface TopBarProps {
  totalXp: number;
  onAddEvent: () => void;
  levelInfo?: AvatarStatus;
  isLevelLoading?: boolean;
}

export function TopBar({ totalXp, onAddEvent, levelInfo, isLevelLoading }: TopBarProps) {
  const level = levelInfo?.current_level ?? (totalXp > 0 ? Math.max(1, Math.floor(totalXp / 100)) : 1);
  const fallbackProgress = totalXp % 100;
  const progressPercent = levelInfo
    ? Math.round((levelInfo.level_progress ?? 0) * 100)
    : fallbackProgress;
  const xpLabel = levelInfo?.xp_next
    ? `${levelInfo.xp_current} / ${levelInfo.xp_next} XP`
    : `${levelInfo?.xp_current ?? totalXp} XP`;


  return (
    <Card className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <DynamicAvatar
          level={level}
          animated={!isLevelLoading}
          variant="badge"
          className="h-16 w-16"
          ariaLabel={`Avatar Level ${level}`}
        />
        <div className="space-y-2">
          <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">XP Progress</div>
          <div className="text-2xl font-semibold">Level {level}</div>
          <div className="text-xs text-muted-foreground">{xpLabel}</div>
          <Progress value={progressPercent} className="w-64" />
          {isLevelLoading ? (
            <div className="h-2 w-20 animate-pulse rounded-full bg-muted" />
          ) : null}
        </div>
      </div>
      <Button onClick={onAddEvent} className="gap-2">
        <Plus className="h-4 w-4" /> Add event
      </Button>
    </Card>
  );
}
