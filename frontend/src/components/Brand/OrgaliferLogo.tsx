import * as React from "react";

import { cn } from "../../lib/utils";

interface OrgaliferLogoProps {
  showWordmark?: boolean;
  className?: string;
  size?: number;
  wordmarkClassName?: string;
}

export function OrgaliferLogo({
  showWordmark = false,
  className,
  size = 96,
  wordmarkClassName,
}: OrgaliferLogoProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);

  const imageClasses = cn("orgalifer-logo", isLoaded && "orgalifer-logo-loaded");
  const inlineStyle: React.CSSProperties = {
    maxHeight: size,
    height: size,
    width: "auto",
    objectFit: "contain",
    display: "block",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/assets/orgalifer-logo.svg"
        alt="Orgalifer"
        className={imageClasses}
        style={inlineStyle}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        role="img"
        aria-label="Orgalifer"
      />
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-lg text-slate-100",
            wordmarkClassName
          )}
        >
          Orgalifer
        </span>
      ) : null}
    </div>
  );
}

export default OrgaliferLogo;
