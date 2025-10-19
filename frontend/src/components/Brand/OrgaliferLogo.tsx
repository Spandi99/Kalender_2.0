import * as React from "react";

import { cn } from "../../lib/utils";

interface OrgaliferLogoProps {
  showWordmark?: boolean;
  className?: string;
  size?: number;
  wordmarkClassName?: string;
}

const PRIMARY = "#0066FF";
const ACCENT = "#00C896";

export function OrgaliferLogo({
  showWordmark = true,
  className,
  size = 32,
  wordmarkClassName,
}: OrgaliferLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden={!showWordmark}
      >
        <defs>
          <linearGradient id="orgalifer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={PRIMARY} />
            <stop offset="100%" stopColor={ACCENT} />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="18" fill="url(#orgalifer-gradient)" />
        <path
          d="M18 42c0-11 9-20 20-20h8v8h-8c-6.627 0-12 5.373-12 12v8h-8z"
          fill="#ffffff"
          opacity="0.92"
        />
        <path
          d="M34 14h8v36h-8z"
          fill="#ffffff"
          opacity="0.85"
        />
      </svg>
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-[1.05rem] text-slate-100",
            wordmarkClassName
          )}
          style={{ fontFamily: "'Inter', 'Nunito', 'Poppins', sans-serif" }}
        >
          Orgalifer
        </span>
      ) : null}
    </div>
  );
}

export default OrgaliferLogo;
