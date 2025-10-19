import * as React from "react";

import { getReadableTextColor, withAlpha } from "../../utils/colorUtils";
import { cn } from "../../lib/utils";

interface UserAvatarProps {
  name: string;
  className?: string;
  imageUrl?: string | null;
  aiPreviewUrl?: string | null;
  size?: number;
  showBadge?: boolean;
}

const PRIMARY = "#0066FF";
const ACCENT = "#00C896";

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function generateInitialsAvatar(name: string, size: number) {
  const initials = getInitials(name);
  const background = withAlpha(PRIMARY, 0.95);
  const textColor = getReadableTextColor(background, {
    lightColor: "#ffffff",
    darkColor: "#0f172a",
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="64" height="64" rx="20" fill="${background}" />
    <circle cx="52" cy="12" r="9" fill="${ACCENT}" opacity="0.85" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-size="28" font-weight="600" fill="${textColor}">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function UserAvatar({
  name,
  className,
  imageUrl,
  aiPreviewUrl,
  size = 40,
  showBadge = true,
}: UserAvatarProps) {
  const initialsAvatar = React.useMemo(() => generateInitialsAvatar(name, size), [name, size]);
  const displaySource = aiPreviewUrl ?? imageUrl ?? initialsAvatar;
  const badgeColor = getReadableTextColor(PRIMARY, { lightColor: "#ffffff", darkColor: "#0f172a" });

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <img
        src={displaySource}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border-2 border-slate-900/30 bg-slate-900/40 object-cover shadow-lg shadow-slate-900/30"
        style={{ minWidth: size, minHeight: size }}
      />
      {showBadge ? (
        <span
          className="absolute bottom-0 right-0 inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-950"
          style={{ backgroundColor: ACCENT, color: badgeColor }}
        >
          •
        </span>
      ) : null}
    </div>
  );
}

export default UserAvatar;
