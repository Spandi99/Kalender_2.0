import { useQuery } from "@tanstack/react-query";

import { fetchLevelStatus, LevelStatus } from "../api/client";

export interface AvatarStatus extends LevelStatus {
  xp_to_next: number | null;
  level_progress: number;
}

export const AVATAR_QUERY_KEY = ["avatar-status"] as const;

export function useAvatar() {
  return useQuery({
    queryKey: AVATAR_QUERY_KEY,
    queryFn: fetchLevelStatus,
    staleTime: 60_000,
    select: (data): AvatarStatus => {
      const xpRange = data.xp_next != null ? data.xp_next - data.xp_previous : null;
      const levelProgress = xpRange && xpRange > 0 ? (data.xp_current - data.xp_previous) / xpRange : 1;

      return {
        ...data,
        xp_to_next: data.xp_next != null ? Math.max(data.xp_next - data.xp_current, 0) : null,
        level_progress: Math.max(0, Math.min(1, levelProgress)),
      };
    },
  });
}
