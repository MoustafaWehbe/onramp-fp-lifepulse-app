/**
 * Returns "YYYY-MM-DD" for "now" as seen from the given IANA timezone.
 * Used everywhere a habit's local calendar day matters (check-in boundaries,
 * reminder scheduling) instead of the server's UTC day, which can disagree
 * with a user's actual "today" by several hours near midnight.
 */
export function todayInTimeZone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Returns "HH:mm" (24-hour) for "now" as seen from the given IANA timezone. */
export function localTimeInTimeZone(timeZone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

/** Whole days between two ISO "YYYY-MM-DD" dates. Negative if `to` precedes `from`. */
export function daysBetweenIsoDates(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** ISO date (YYYY-MM-DD) `days` days before "now" in the given IANA timezone. */
export function daysAgoInTimeZone(days: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  // Construct at UTC noon on the local date to avoid DST edge cases, then
  // step back `days` days and re-format as YYYY-MM-DD.
  const local = new Date(
    `${get("year")}-${get("month")}-${get("day")}T12:00:00Z`,
  );
  local.setUTCDate(local.getUTCDate() - days);
  return local.toISOString().slice(0, 10);
}
