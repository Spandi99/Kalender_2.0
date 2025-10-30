const LOCAL_TIMEZONE = "Europe/Zurich";
const LOCALE = "de-CH";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(LOCALE, {
  timeZone: LOCAL_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const TIME_FORMATTER = new Intl.DateTimeFormat(LOCALE, {
  timeZone: LOCAL_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type SupportedInput = string | Date | null | undefined;

function toDate(input: SupportedInput): Date | null {
  if (!input) {
    return null;
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatDateTime(value: SupportedInput): string | null {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  const parts = DATE_TIME_FORMATTER.formatToParts(date);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const day = lookup.get("day");
  const month = lookup.get("month");
  const year = lookup.get("year");
  const hour = lookup.get("hour");
  const minute = lookup.get("minute");
  if (!day || !month || !year || !hour || !minute) {
    return DATE_TIME_FORMATTER.format(date);
  }
  return `${day}.${month}.${year} ${hour}:${minute}`;
}

export function formatDateTimeRange(start: SupportedInput, end: SupportedInput): string {
  const startText = formatDateTime(start) ?? "–";
  const endText = formatDateTime(end) ?? "–";
  return `${startText} – ${endText}`;
}

export function formatTime(value: SupportedInput): string | null {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  return TIME_FORMATTER.format(date);
}

export function getLocalDayKey(value: SupportedInput): string | null {
  const date = toDate(value);
  if (!date) {
    return null;
  }
  const parts = DATE_TIME_FORMATTER.formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  if (!day || !month || !year) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

export { LOCAL_TIMEZONE };
