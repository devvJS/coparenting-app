// Calendar date helpers. All grid-level dates are computed in local time so the
// rendered month aligns with the user's wall clock; events (timestamptz) are
// converted to local date keys via toLocalDateKey.

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function toLocalDateKey(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parses a YYYY-MM-DD string as a local-time date (avoids the off-by-one
// timezone bug that comes from Date.parse on date-only strings).
export function fromDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function buildMonthGrid(month: Date): Date[] {
  const first = startOfWeek(startOfMonth(month));
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(first, i));
  }
  return cells;
}

export function formatMonthLabel(month: Date): string {
  return month.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function formatTimeRange(start: string, end: string | null): string {
  const s = new Date(start);
  const sLabel = s.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!end) return sLabel;
  const e = new Date(end);
  const eLabel = e.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${sLabel} – ${eLabel}`;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Convert a Date to the value-shape an <input type="datetime-local"> expects.
export function toDateTimeLocalInput(input: Date | string | null): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalInput(value: string): string {
  // <input type="datetime-local"> returns "YYYY-MM-DDTHH:MM" without timezone.
  // Constructing a Date from this string treats it as local time, which is what
  // we want before converting to ISO for storage.
  return new Date(value).toISOString();
}
