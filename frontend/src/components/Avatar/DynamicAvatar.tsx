import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

export type AvatarVariant = "full" | "bust" | "badge";

export interface AvatarProps {
  level: number;
  animated?: boolean;
  variant?: AvatarVariant;
  className?: string;
  ariaLabel?: string;
}

interface AvatarStage {
  min: number;
  max: number;
  layers: string[];
}

export const avatarStages: AvatarStage[] = [
  { min: 1, max: 4, layers: ["base"] },
  { min: 5, max: 9, layers: ["base", "shirt_alt"] },
  { min: 10, max: 14, layers: ["base", "shirt_alt", "band"] },
  { min: 15, max: 19, layers: ["base", "rune_layer"] },
  { min: 20, max: 29, layers: ["base", "robe", "particles"] },
  { min: 30, max: 39, layers: ["base", "robe", "aura"] },
  { min: 40, max: 49, layers: ["base", "robe", "staff", "light_orb"] },
  { min: 50, max: 99, layers: ["base", "robe", "rune_layer", "aura", "particles"] },
];

type LayerLoader = () => Promise<string>;

const rawLayerImports = import.meta.glob("/assets/avatar/*.svg", { query: "?raw", import: "default" });

const layerLoaders: Record<string, LayerLoader> = Object.fromEntries(
  Object.entries(rawLayerImports).map(([path, loader]) => {
    const name = path.split('/').pop()?.replace(/\.svg$/i, '');
    return [name ?? path, loader as LayerLoader];
  })
);

export const availableAvatarLayers = Object.keys(layerLoaders);

const placeHolderMarkup = `
  <g class="pointer-events-none">
    <circle cx="64" cy="92" r="46" fill="rgba(15,23,42,0.6)" stroke="rgba(71,85,105,0.6)" stroke-width="2" />
    <path d="M64 38c-10.493 0-19 8.507-19 19s8.507 19 19 19 19-8.507 19-19-8.507-19-19-19z" fill="rgba(51,65,85,0.85)" />
    <path d="M40 110c0-10.493 10.745-19 24-19s24 8.507 24 19v10H40v-10z" fill="rgba(30,41,59,0.85)" />
  </g>
`;

function sanitizeSvg(raw: string) {
  return raw.replace(/<svg[^>]*>/i, "").replace(/<\/svg>/i, "").trim();
}

function resolveStage(level: number) {
  const normalized = Number.isFinite(level) ? level : avatarStages[0].min;
  const stage = avatarStages.find((entry) => normalized >= entry.min && normalized <= entry.max);
  if (stage) {
    return stage;
  }
  if (normalized < avatarStages[0].min) {
    return avatarStages[0];
  }
  return avatarStages[avatarStages.length - 1];
}

function useLevelUpFlag(level: number) {
  const [active, setActive] = useState(false);
  const previous = useRef(level);

  useEffect(() => {
    if (level > previous.current) {
      setActive(true);
      previous.current = level;
      const timeout = window.setTimeout(() => setActive(false), 1500);
      return () => window.clearTimeout(timeout);
    }
    previous.current = level;
    return undefined;
  }, [level]);

  return active;
}

export function DynamicAvatar({ level, animated = true, variant = "full", className, ariaLabel }: AvatarProps) {
  const stage = useMemo(() => resolveStage(level), [level]);
  const layersToRender = useMemo(() => {
    const uniqueLayers = Array.from(new Set(["base", ...stage.layers]));
    const available = uniqueLayers.filter((layer) => Boolean(layer));
    return available;
  }, [stage.layers]);

  const [loadedLayers, setLoadedLayers] = useState<Record<string, string>>({});
  const [missingLayers, setMissingLayers] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadLayers() {
      const results = await Promise.all(
        layersToRender.map(async (layer) => {
          const loader = layerLoaders[layer];
          if (!loader) {
            return [layer, null] as const;
          }
          try {
            const raw = await loader();
            return [layer, sanitizeSvg(raw)] as const;
          } catch (error) {
            console.warn(`Failed to load avatar layer "${layer}"`, error);
            return [layer, null] as const;
          }
        })
      );

      if (!mounted) return;

      setLoadedLayers(() => {
        const next: Record<string, string> = {};
        for (const [layer, markup] of results) {
          if (markup) {
            next[layer] = markup;
          }
        }
        return next;
      });

      setMissingLayers(results.filter(([, markup]) => !markup).map(([layer]) => layer));
    }

    if (layersToRender.length) {
      loadLayers();
    }

    return () => {
      mounted = false;
    };
  }, [layersToRender]);

  const levelUpActive = useLevelUpFlag(level);
  const hasMissingLayers = missingLayers.some((layer) => layer !== "base");

  const containerClasses = useMemo(() => {
    const base = "relative group flex items-center justify-center text-slate-100";
    const variants: Record<AvatarVariant, string> = {
      full: "h-44 w-44 rounded-[2.5rem]",
      bust: "h-32 w-32 rounded-3xl overflow-hidden",
      badge: "h-16 w-16 rounded-full overflow-hidden border border-slate-700/70",
    };
    return clsx(base, variants[variant], className);
  }, [variant, className]);

  const svgClasses = useMemo(() => {
    const base = "relative h-full w-full transition-transform duration-[800ms] ease-in-out";
    const variantAdjustments: Record<AvatarVariant, string> = {
      full: "",
      bust: "-translate-y-4 scale-[1.05]",
      badge: "-translate-y-6 scale-[1.15]",
    };

    return clsx(
      base,
      variantAdjustments[variant],
      animated && "animate-avatar-breathe",
      animated && "group-hover:scale-[1.04]",
      animated && "group-hover:drop-shadow-[0_0_18px_rgba(74,222,128,0.55)]",
      levelUpActive && "animate-avatar-level-up"
    );
  }, [animated, variant, levelUpActive]);

  const glowClasses = clsx(
    "pointer-events-none absolute inset-0 rounded-full bg-emerald-400/20 blur-3xl transition-opacity duration-700",
    animated && "animate-avatar-halo",
    animated ? "opacity-40 group-hover:opacity-70" : "opacity-0",
    levelUpActive && "opacity-80"
  );

  const aria = ariaLabel ?? `Avatar level ${level}`;

  return (
    <div className={containerClasses} aria-label={aria} role="img">
      <div className={glowClasses} />
      <svg viewBox="0 0 128 160" className={svgClasses}>
        <g>
          {layersToRender.map((layer) => {
            const markup = loadedLayers[layer];
            if (markup) {
              return <g key={layer} dangerouslySetInnerHTML={{ __html: markup }} />;
            }
            return (
              <g key={layer} className="text-slate-500">
                <g dangerouslySetInnerHTML={{ __html: placeHolderMarkup }} />
              </g>
            );
          })}
        </g>
      </svg>
      {hasMissingLayers ? (
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300 shadow-lg">
          Coming soon
        </span>
      ) : null}
    </div>
  );
}

export default DynamicAvatar;
