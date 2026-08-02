const VN_TZ = "Asia/Ho_Chi_Minh";

/** Format a Date as YYYY-MM-DD in Asia/Ho_Chi_Minh. */
export function toDateKey(date: Date, timeZone = VN_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's date key in Vietnam timezone. */
export function todayKey(timeZone = VN_TZ): string {
  return toDateKey(new Date(), timeZone);
}

/** Parse YYYY-MM-DD or DD/MM/YYYY into a normalized YYYY-MM-DD key. */
export function parseDateKey(input: string): string | null {
  const raw = input.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (!isValidYmd(y, m, d)) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (!isValidYmd(y, m, d)) return null;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  return null;
}

/** Parse MM/YYYY into { year, month } (month 1-12). */
export function parseMonthYear(input: string): { year: number; month: number } | null {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function currentMonthYear(timeZone = VN_TZ): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
}

/** Inclusive list of YYYY-MM-DD keys from start to end. */
export function eachDateKey(startKey: string, endKey: string): string[] {
  if (startKey > endKey) return [];
  const keys: string[] = [];
  let cursor = startKey;
  while (cursor <= endKey) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  return { start, end };
}

/** Days between two YYYY-MM-DD keys (end - start). */
export function daysBetween(startKey: string, endKey: string): number {
  const start = utcNoon(startKey);
  const end = utcNoon(endKey);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function addDays(dateKey: string, days: number): string {
  const d = utcNoon(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function formatDateVn(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

export function formatMonthVn(year: number, month: number): string {
  return `${pad2(month)}/${year}`;
}

function utcNoon(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
