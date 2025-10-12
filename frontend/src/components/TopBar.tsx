import { Plus } from "lucide-react";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";

interface TopBarProps {
  totalXp: number;
  onAddEvent: () => void;
}

export function TopBar({ totalXp, onAddEvent }: TopBarProps) {
  const level = Math.floor(totalXp / 100);
  const progress = totalXp % 100;

  return (
    <Card className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
      <div className="space-y-2">
        <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">XP Progress</div>
        <div className="text-2xl font-semibold">Level {level}</div>
        <Progress value={progress} className="w-64" />
      </div>
      <Button onClick={onAddEvent} className="gap-2">
        <Plus className="h-4 w-4" /> Add event
      </Button>
    </Card>
  );
}
