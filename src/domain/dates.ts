/**
 * Pure date and timezone utilities using native Date and Intl.
 * No external date libraries (no moment, no dayjs, no date-fns).
 *
 * Go vs TypeScript note:
 * In Go, `time.Time` carries a `*time.Location`. Calling `t.In(loc).Hour()` converts
 * the time to that location's civil wall-clock hour.
 * In JS, `Date` internally stores milliseconds since Unix epoch (UTC).
 * To extract the wall-clock hour or weekday in an arbitrary IANA zone (e.g. "Asia/Kolkata"),
 * we use `Intl.DateTimeFormat` with `{ timeZone: tz }`.
 */

export interface DateParts {
  year: number;
  month: number;    // 1-12
  day: number;      // 1-31
  hour: number;     // 0-23
  minute: number;   // 0-59
  weekday: number;  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  weekdayShort: string; // 'Sun', 'Mon', etc.
}

export function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

/**
 * Extracts wall-clock components for an epoch millisecond timestamp in a specific timezone.
 */
export function getPartsInTz(epochMs: number, tz: string): DateParts {
  const date = new Date(epochMs);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let weekdayShort = 'Sun';

  for (const part of parts) {
    if (part.type === 'year') year = parseInt(part.value, 10);
    else if (part.type === 'month') month = parseInt(part.value, 10);
    else if (part.type === 'day') day = parseInt(part.value, 10);
    else if (part.type === 'hour') hour = parseInt(part.value, 10);
    else if (part.type === 'minute') minute = parseInt(part.value, 10);
    else if (part.type === 'weekday') weekdayShort = part.value;
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[weekdayShort] ?? 0;

  return { year, month, day, hour, minute, weekday, weekdayShort };
}

/**
 * Returns date in YYYY-MM-DD format in specified timezone.
 */
export function toISODateInTz(epochMs: number, tz: string): string {
  const p = getPartsInTz(epochMs, tz);
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  return `${p.year}-${mm}-${dd}`;
}

/**
 * Returns month key in YYYY-MM format in specified timezone.
 */
export function toISOMonthInTz(epochMs: number, tz: string): string {
  const p = getPartsInTz(epochMs, tz);
  const mm = String(p.month).padStart(2, '0');
  return `${p.year}-${mm}`;
}

/**
 * Human-readable date label: e.g. "25 Oct 2026"
 */
export function formatDateLabel(epochMs: number, tz: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epochMs));
}

/**
 * Human-readable time label: e.g. "7:56 PM"
 */
export function formatTimeLabel(epochMs: number, tz: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(epochMs));
}

/**
 * Formats day header with relative today/yesterday where appropriate.
 */
export function formatDayHeader(epochMs: number, tz: string, nowMs: number = Date.now()): string {
  const entryIso = toISODateInTz(epochMs, tz);
  const todayIso = toISODateInTz(nowMs, tz);
  const yesterdayIso = toISODateInTz(nowMs - 86400000, tz);

  if (entryIso === todayIso) {
    return `Today, ${formatDateLabel(epochMs, tz)}`;
  }
  if (entryIso === yesterdayIso) {
    return `Yesterday, ${formatDateLabel(epochMs, tz)}`;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epochMs));
}

export type PresetRangeKey = 'thisMonth' | 'last3Months' | 'ytd' | 'all';

export interface DateRange {
  label: string;
  startMs: number;
  endMs: number;
}

/**
 * Computes millisecond boundaries for standard dashboard date range presets.
 */
export function getDateRangePreset(preset: PresetRangeKey, nowMs: number = Date.now(), tz: string = getDefaultTimezone()): DateRange {
  const parts = getPartsInTz(nowMs, tz);

  switch (preset) {
    case 'thisMonth': {
      // Start of 1st day of current month in local tz
      const startOfMonth = new Date(parts.year, parts.month - 1, 1, 0, 0, 0, 0).getTime();
      return {
        label: 'This Month',
        startMs: startOfMonth,
        endMs: nowMs,
      };
    }
    case 'last3Months': {
      // Approximate 90 days or 3 calendar months back
      const threeMonthsAgo = new Date(parts.year, parts.month - 3, 1, 0, 0, 0, 0).getTime();
      return {
        label: 'Past 3 Months',
        startMs: threeMonthsAgo,
        endMs: nowMs,
      };
    }
    case 'ytd': {
      const startOfYear = new Date(parts.year, 0, 1, 0, 0, 0, 0).getTime();
      return {
        label: 'Year to Date',
        startMs: startOfYear,
        endMs: nowMs,
      };
    }
    case 'all':
    default: {
      return {
        label: 'All Time',
        startMs: 0,
        endMs: nowMs + 86400000,
      };
    }
  }
}

/**
 * Returns previous period with the identical duration, ending right when the current period starts.
 */
export function getPreviousPeriodRange(current: DateRange): DateRange {
  const duration = current.endMs - current.startMs;
  return {
    label: `Previous ${current.label}`,
    startMs: Math.max(0, current.startMs - duration),
    endMs: current.startMs,
  };
}
