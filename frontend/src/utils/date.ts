/**
 * Single source of truth for date handling.
 *
 * RULE: never use `new Date('YYYY-MM-DD')`. The ES spec parses date-only strings
 * as UTC midnight, so in negative-offset timezones the date shifts one day back.
 * Always go through `parseLocalDate` / `toLocalISODate`.
 */

/** `YYYY-MM-DD` — the wire format used by the backend (LocalDate). */
export type ISODateString = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Serializes a Date to a local-time `YYYY-MM-DD` key (no UTC shift). */
export function toLocalISODate(d: Date): ISODateString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parses a `YYYY-MM-DD` (or ISO datetime) string as *local* midnight.
 * Returns an Invalid Date for unparseable input, mirroring `new Date()`.
 */
export function parseLocalDate(s: string): Date {
  const match = ISO_DATE_RE.exec(s);
  if (!match) return new Date(NaN);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** Accepts either a Date or an ISO string and normalizes to a local Date. */
export function toLocalDate(value: Date | string): Date {
  return value instanceof Date ? value : parseLocalDate(value);
}

/** Display format `YYYY/MM/DD`. Falls back to the raw input when invalid. */
export function formatDate(value: Date | string): string {
  const d = toLocalDate(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return toLocalISODate(d).replace(/-/g, '/');
}

/** Today at local midnight. */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today as a `YYYY-MM-DD` key. */
export function todayISO(): ISODateString {
  return toLocalISODate(new Date());
}

export function isValidISODate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const d = parseLocalDate(s);
  return !Number.isNaN(d.getTime()) && toLocalISODate(d) === s.slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Monday-based weekday index: Monday = 0 … Sunday = 6. */
export function mondayBasedDay(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Monday at local midnight for the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return addDays(start, -mondayBasedDay(start));
}

/** Sunday of the week containing `d`. */
export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6);
}

/** Chronological comparator for `YYYY-MM-DD` strings (lexicographic == chronological). */
export function compareISODate(a: ISODateString, b: ISODateString): number {
  return a.localeCompare(b);
}
