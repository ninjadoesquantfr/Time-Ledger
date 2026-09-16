import { TimeEntryData, HourSlot, DayTimeline } from '@/types';

/**
 * Build a full 24-hour timeline for a given day from a list of entries.
 * Hours with no entries are returned as empty slots.
 */
export function buildDayTimeline(entries: TimeEntryData[]): DayTimeline {
  const hours: DayTimeline = [];

  for (let h = 0; h < 24; h++) {
    const hourEntries = entries.filter((e) => {
      const entryHour = Math.floor(e.startMinute / 60);
      return entryHour === h;
    });

    const totalMinutes = hourEntries.reduce((sum, e) => sum + e.durationMinutes, 0);

    hours.push({
      hour: h,
      entries: hourEntries,
      totalMinutes,
      remainingMinutes: 60 - totalMinutes,
      state: totalMinutes === 0 ? 'empty' : totalMinutes >= 60 ? 'full' : 'partial',
    });
  }

  return hours;
}

/**
 * Format hour as 12h display label (e.g. 0 → "12 AM", 13 → "1 PM")
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Format minutes as a human-readable duration (e.g. 90 → "1h 30min")
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Format a "YYYY-MM-DD" date string as a readable label
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Get today's date as "YYYY-MM-DD" using local timezone
 */
export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get the current hour (0–23)
 */
export function getCurrentHour(): number {
  return new Date().getHours();
}

/**
 * Get current minute of hour (0–59)
 */
export function getCurrentMinute(): number {
  return new Date().getMinutes();
}

/**
 * Convert HH:MM string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Convert minutes since midnight to HH:MM string
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Distribute a time range (startMinute, endMinute) across hour buckets.
 * Returns array of {startMinute, durationMinutes} for each affected hour.
 */
export function distributeAcrossHours(
  startMinute: number,
  endMinute: number,
): Array<{ startMinute: number; durationMinutes: number }> {
  const result = [];
  let current = startMinute;

  while (current < endMinute) {
    const hourBoundary = (Math.floor(current / 60) + 1) * 60;
    const sliceEnd = Math.min(hourBoundary, endMinute);
    const duration = sliceEnd - current;
    if (duration > 0) {
      result.push({ startMinute: current, durationMinutes: duration });
    }
    current = sliceEnd;
  }

  return result;
}

/**
 * Check if two time ranges overlap (both in minutes since midnight)
 */
export function rangesOverlap(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number,
): boolean {
  const aEnd = aStart + aDuration;
  const bEnd = bStart + bDuration;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Get "On This Day" comparison dates relative to a given date string
 */
export function getOnThisDayDates(dateStr: string): Array<{ label: string; date: string }> {
  const [year, month, day] = dateStr.split('-').map(Number);
  const base = new Date(year, month - 1, day);

  const results: Array<{ label: string; date: string }> = [];

  const addDate = (label: string, d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const str = `${y}-${m}-${dd}`;
    if (str !== dateStr) {
      results.push({ label, date: str });
    }
  };

  // 1 week ago
  const oneWeekAgo = new Date(base);
  oneWeekAgo.setDate(base.getDate() - 7);
  addDate('1 week ago', oneWeekAgo);

  // 2 weeks ago
  const twoWeeksAgo = new Date(base);
  twoWeeksAgo.setDate(base.getDate() - 14);
  addDate('2 weeks ago', twoWeeksAgo);

  // 1 month ago
  const oneMonthAgo = new Date(base);
  oneMonthAgo.setMonth(base.getMonth() - 1);
  addDate('1 month ago', oneMonthAgo);

  // 3 months ago
  const threeMonthsAgo = new Date(base);
  threeMonthsAgo.setMonth(base.getMonth() - 3);
  addDate('3 months ago', threeMonthsAgo);

  // 6 months ago
  const sixMonthsAgo = new Date(base);
  sixMonthsAgo.setMonth(base.getMonth() - 6);
  addDate('6 months ago', sixMonthsAgo);

  // 1 year ago
  const oneYearAgo = new Date(base);
  oneYearAgo.setFullYear(base.getFullYear() - 1);
  addDate('1 year ago', oneYearAgo);

  return results;
}
