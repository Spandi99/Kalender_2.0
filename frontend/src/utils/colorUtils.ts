const HEX_REGEX = /^#([\da-f]{3,8})$/i;
const RGB_REGEX =
  /^rgba?\(\s*([\d.]+%?)\s*,?\s*([\d.]+%?)\s*,?\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;
const HSL_REGEX =
  /^hsla?\(\s*([-\d.]+)(?:deg|rad|turn)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:[\s/]+([\d.]+%?))?\s*\)$/i;

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function expandShortHex(value: string) {
  return value
    .split("")
    .map((char) => char + char)
    .join("");
}

function hexToRgba(hex: string): RgbaColor | null {
  const match = HEX_REGEX.exec(hex.trim());
  if (!match) return null;

  let value = match[1];
  if (value.length === 3 || value.length === 4) {
    value = expandShortHex(value);
  }

  if (value.length !== 6 && value.length !== 8) {
    return null;
  }

  const hasAlpha = value.length === 8;
  const intVal = Number.parseInt(value, 16);

  const r = (intVal >> (hasAlpha ? 24 : 16)) & 0xff;
  const g = (intVal >> (hasAlpha ? 16 : 8)) & 0xff;
  const b = (intVal >> (hasAlpha ? 8 : 0)) & 0xff;
  const a = hasAlpha ? (intVal & 0xff) / 255 : 1;

  return { r, g, b, a };
}

function percentageChannel(value: string) {
  if (value.endsWith("%")) {
    return clamp(Number.parseFloat(value) / 100) * 255;
  }
  return clamp(Number.parseFloat(value) / 255, 0, 1) * 255;
}

function rgbStringToRgba(color: string): RgbaColor | null {
  const match = RGB_REGEX.exec(color.trim());
  if (!match) return null;

  const [, rRaw, gRaw, bRaw, aRaw] = match;
  const r = Math.round(percentageChannel(rRaw));
  const g = Math.round(percentageChannel(gRaw));
  const b = Math.round(percentageChannel(bRaw));
  const a = aRaw
    ? aRaw.endsWith("%")
      ? clamp(Number.parseFloat(aRaw) / 100)
      : clamp(Number.parseFloat(aRaw))
    : 1;

  return { r, g, b, a };
}

function hueToRgb(p: number, q: number, t: number) {
  let result = t;
  if (result < 0) result += 1;
  if (result > 1) result -= 1;
  if (result < 1 / 6) return p + (q - p) * 6 * result;
  if (result < 1 / 2) return q;
  if (result < 2 / 3) return p + (q - p) * (2 / 3 - result) * 6;
  return p;
}

function hslToRgba(color: string): RgbaColor | null {
  const match = HSL_REGEX.exec(color.trim());
  if (!match) return null;

  const [, hRaw, sRaw, lRaw, aRaw] = match;

  const h = ((Number.parseFloat(hRaw) % 360) + 360) % 360;
  const s = clamp(Number.parseFloat(sRaw) / 100);
  const l = clamp(Number.parseFloat(lRaw) / 100);
  const a = aRaw
    ? aRaw.endsWith("%")
      ? clamp(Number.parseFloat(aRaw) / 100)
      : clamp(Number.parseFloat(aRaw))
    : 1;

  if (s === 0) {
    const value = Math.round(l * 255);
    return { r: value, g: value, b: value, a };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;

  const r = Math.round(hueToRgb(p, q, hk + 1 / 3) * 255);
  const g = Math.round(hueToRgb(p, q, hk) * 255);
  const b = Math.round(hueToRgb(p, q, hk - 1 / 3) * 255);

  return { r, g, b, a };
}

function parseColor(color: string): RgbaColor | null {
  if (!color) {
    return null;
  }
  if (color === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return hexToRgba(color) ?? rgbStringToRgba(color) ?? hslToRgba(color);
}

function componentToLinear(value: number) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function luminance({ r, g, b }: RgbaColor) {
  const rLinear = componentToLinear(r);
  const gLinear = componentToLinear(g);
  const bLinear = componentToLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

export function getContrastRatio(colorA: string, colorB: string) {
  const parsedA = parseColor(colorA);
  const parsedB = parseColor(colorB);
  if (!parsedA || !parsedB) {
    return 1;
  }

  const lumA = luminance(parsedA);
  const lumB = luminance(parsedB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableTextColor(
  backgroundColor: string,
  options?: {
    lightColor?: string;
    darkColor?: string;
    minContrast?: number;
    fallbackColor?: string;
  }
) {
  const lightColor = options?.lightColor ?? "#f8f8f8";
  const darkColor = options?.darkColor ?? "#111111";
  const minContrast = options?.minContrast ?? 4.5;

  const background = parseColor(backgroundColor);
  if (!background) {
    return options?.fallbackColor ?? darkColor;
  }

  const lightContrast = getContrastRatio(backgroundColor, lightColor);
  const darkContrast = getContrastRatio(backgroundColor, darkColor);

  let preferredColor = lightContrast >= darkContrast ? lightColor : darkColor;
  let preferredContrast = Math.max(lightContrast, darkContrast);

  if (preferredContrast >= minContrast) {
    return preferredColor;
  }

  const candidates = new Set(
    [
      lightColor,
      darkColor,
      options?.fallbackColor,
      "#ffffff",
      "#000000",
      "#f5f5f5",
      "#0f172a",
      "#1f2937",
      "#f8fafc",
      "#020617",
    ].filter(Boolean) as string[]
  );

  preferredContrast = 0;
  preferredColor = darkColor;

  for (const candidate of candidates) {
    const contrast = getContrastRatio(backgroundColor, candidate);
    if (contrast > preferredContrast) {
      preferredContrast = contrast;
      preferredColor = candidate;
    }
    if (preferredContrast >= minContrast) {
      break;
    }
  }

  return preferredColor;
}

export function rgbToHex({ r, g, b, a }: RgbaColor) {
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  if (a !== undefined && a < 1) {
    const alpha = Math.round(a * 255);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(alpha)}`;
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function toRgbaString(color: string, alpha?: number) {
  const parsed = parseColor(color);
  if (!parsed) {
    return color;
  }
  const finalAlpha = alpha !== undefined ? clamp(alpha) : parsed.a;
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${Number(finalAlpha.toFixed(3))})`;
}

export function withAlpha(color: string, alpha: number) {
  return toRgbaString(color, alpha);
}

export function adjustLuminance(color: string, amount: number) {
  const parsed = parseColor(color);
  if (!parsed) {
    return color;
  }

  const factor = clamp(amount, -1, 1);
  const adjust = (channel: number) => {
    if (factor < 0) {
      return Math.round(channel * (1 + factor));
    }
    return Math.round(channel + (255 - channel) * factor);
  };

  return rgbToHex({
    r: adjust(parsed.r),
    g: adjust(parsed.g),
    b: adjust(parsed.b),
    a: parsed.a,
  });
}

export function mixColors(colorA: string, colorB: string, weight = 0.5) {
  const parsedA = parseColor(colorA);
  const parsedB = parseColor(colorB);
  if (!parsedA || !parsedB) {
    return colorA;
  }

  const w = clamp(weight);
  return rgbToHex({
    r: Math.round(parsedA.r * w + parsedB.r * (1 - w)),
    g: Math.round(parsedA.g * w + parsedB.g * (1 - w)),
    b: Math.round(parsedA.b * w + parsedB.b * (1 - w)),
    a: parsedA.a * w + parsedB.a * (1 - w),
  });
}

export function ensureContrast(backgroundColor: string, preferredTextColor: string, minContrast = 4.5) {
  const contrast = getContrastRatio(backgroundColor, preferredTextColor);
  if (contrast >= minContrast) {
    return preferredTextColor;
  }
  return getReadableTextColor(backgroundColor, {
    minContrast,
    fallbackColor: preferredTextColor,
  });
}

export function parseToRgba(color: string) {
  return parseColor(color);
}

export const COLOR_PRESETS = [
  "#0EA5E9",
  "#6366F1",
  "#F97316",
  "#F43F5E",
  "#10B981",
  "#EAB308",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F59E0B",
];
