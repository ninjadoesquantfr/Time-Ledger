// Shared TypeScript types across the application

export interface CategoryWithSubs {
  id: string;
  name: string;
  color: string;
  order: number;
  isSystem: boolean;
  archived: boolean;
  subcategories: SubcategoryData[];
}

export interface SubcategoryData {
  id: string;
  name: string;
  order: number;
  archived: boolean;
  categoryId: string;
}

export interface TimeEntryData {
  id: string;
  date: string; // "YYYY-MM-DD"
  startMinute: number; // 0–1439
  durationMinutes: number; // 1–60
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  note: string | null;
  isUnaccounted: boolean;
  createdAt: string;
  updatedAt: string;
}

// An hour slot on the timeline (0 = midnight, 23 = 11pm)
export interface HourSlot {
  hour: number; // 0–23
  entries: TimeEntryData[];
  totalMinutes: number; // sum of entry durations
  remainingMinutes: number; // 60 - totalMinutes
  state: 'empty' | 'partial' | 'full'; // for UI
}

export type DayTimeline = HourSlot[];

export interface LogEntryInput {
  date: string;
  startMinute: number;
  durationMinutes: number;
  categoryId: string;
  subcategoryId?: string;
  note?: string;
  isUnaccounted?: boolean;
}

export interface OverlapInfo {
  conflicting: TimeEntryData[];
  overlapMinutes: number;
}

// Statistics types
export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalMinutes: number;
  percentage: number;
  subcategoryTotals: SubcategoryTotal[];
}

export interface SubcategoryTotal {
  subcategoryId: string | null;
  subcategoryName: string | null;
  totalMinutes: number;
  percentage: number;
}

export interface DailySummary {
  date: string;
  loggedMinutes: number;
  unaccountedMinutes: number;
  unloggedMinutes: number;
  loggedPercentage: number;
  categoryBreakdown: CategoryTotal[];
}

export interface PeriodStats {
  period: {
    start: string;
    end: string;
    label: string;
  };
  totals: {
    loggedMinutes: number;
    unaccountedMinutes: number;
    unloggedMinutes: number;
    totalPossibleMinutes: number;
  };
  categoryTotals: CategoryTotal[];
  dailySummaries: DailySummary[];
  daysLogged: number;
  totalDays: number;
}

export interface OnThisDayEntry {
  label: string; // e.g. "1 week ago" | "1 month ago" | "1 year ago"
  date: string;
  entries: TimeEntryData[];
  summary: string; // e.g. "Sleep 8h, Study 3h"
}
