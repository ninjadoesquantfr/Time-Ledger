'use client';

import { useState, useEffect, useCallback } from 'react';
import { CategoryWithSubs, TimeEntryData, DayTimeline } from '@/types';
import { formatDate, formatHour, buildDayTimeline } from '@/lib/time-utils';
import TimelineView from '@/components/timeline/TimelineView';
import LoggingModal from '@/components/logging/LoggingModal';
import styles from './history.module.css';

interface DaySummary {
  date: string;
  dayNumber: number;
  loggedMinutes: number;
  unaccountedMinutes: number;
  entryCount: number;
  loggedPercentage: number;
  isFuture: boolean;
}

interface Props {
  categories: CategoryWithSubs[];
  today: string;
  initialMonth: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HistoryClient({ categories, today, initialMonth }: Props) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [dayEntries, setDayEntries] = useState<TimeEntryData[]>([]);
  const [dayTimeline, setDayTimeline] = useState<DayTimeline>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loggingHour, setLoggingHour] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntryData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TimeEntryData[]>([]);
  const [searching, setSearching] = useState(false);

  // Load month overview
  const loadMonthData = useCallback(async (month: string) => {
    const res = await fetch(`/api/history?month=${month}`);
    if (res.ok) {
      const data = await res.json();
      setDays(data.days);
    }
  }, []);

  useEffect(() => {
    loadMonthData(currentMonth);
  }, [currentMonth, loadMonthData]);

  // Load selected date entries
  const loadDateEntries = useCallback(async (date: string) => {
    setLoadingDay(true);
    const res = await fetch(`/api/entries?date=${date}`);
    if (res.ok) {
      const data = await res.json();
      setDayEntries(data.entries);
      setDayTimeline(buildDayTimeline(data.entries));
    }
    setLoadingDay(false);
  }, []);

  useEffect(() => {
    loadDateEntries(selectedDate);
  }, [selectedDate, loadDateEntries]);

  // Search handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.entries);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function changeMonth(offset: number) {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    setCurrentMonth(`${ny}-${nm}`);
  }

  // Month label
  const [year, month] = currentMonth.split('-').map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate calendar leading empty cells
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  function openLogging(hour: number) {
    setLoggingHour(hour);
    setEditingEntry(null);
    setIsModalOpen(true);
  }

  function openEditing(entry: TimeEntryData) {
    setEditingEntry(entry);
    setLoggingHour(Math.floor(entry.startMinute / 60));
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setLoggingHour(null);
    setEditingEntry(null);
  }

  async function handleSaved() {
    await loadDateEntries(selectedDate);
    await loadMonthData(currentMonth);
    closeModal();
  }

  return (
    <div className={styles.page}>
      <div className="page-container">
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>History</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Browse and review your past time ledger. Click any day to inspect or backfill hours.
            </p>
          </div>

          <div className={styles.searchBox}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search entries, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Search Results if query present */}
        {searchQuery.trim() && (
          <div className={styles.searchResultsSection}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
              {searching ? 'Searching...' : `Found ${searchResults.length} entries for "${searchQuery}":`}
            </div>
            {searchResults.map((entry) => (
              <div
                key={entry.id}
                className={styles.searchItem}
                onClick={() => {
                  setSelectedDate(entry.date);
                  setSearchQuery('');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: entry.categoryColor,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {entry.categoryName}
                      {entry.subcategoryName && ` › ${entry.subcategoryName}`}
                    </div>
                    {entry.note && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {entry.note}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>
                    {entry.date}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {formatHour(Math.floor(entry.startMinute / 60))} ({entry.durationMinutes}m)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Month Calendar Card */}
        <div className={styles.calendarCard}>
          <div className={styles.navRow}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              ← Prev
            </button>
            <span className={styles.monthTitle}>{monthName}</span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const curr = today.slice(0, 7);
                  setCurrentMonth(curr);
                  setSelectedDate(today);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
              >
                Next →
              </button>
            </div>
          </div>

          <div className={styles.weekdaysHeader}>
            {WEEKDAYS.map((wd) => (
              <div key={wd}>{wd}</div>
            ))}
          </div>

          <div className={styles.daysGrid}>
            {/* Blank cells for padding */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {days.map((day) => {
              const isSelected = day.date === selectedDate;
              let heatClass = '';
              if (day.loggedPercentage >= 60) heatClass = styles.heatHigh;
              else if (day.loggedPercentage > 0) heatClass = styles.heatMed;

              return (
                <button
                  key={day.date}
                  type="button"
                  className={`${styles.dayCell} ${isSelected ? styles.dayCellActive : ''} ${
                    day.isFuture ? styles.dayCellFuture : ''
                  }`}
                  onClick={() => setSelectedDate(day.date)}
                  disabled={day.isFuture}
                >
                  <span className={styles.dayNum}>{day.dayNumber}</span>
                  {day.loggedPercentage > 0 && (
                    <span className={`${styles.dayPercent} ${heatClass}`}>
                      {day.loggedPercentage}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Timeline Details */}
        <section className={styles.dayDetailSection}>
          <div className={styles.dayDetailHeader}>
            <div>
              <h2 className={styles.dayDetailTitle}>{formatDate(selectedDate)}</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                {dayEntries.length === 0
                  ? 'No entries recorded for this date.'
                  : `${dayEntries.length} entries · ${Math.round(
                      (dayEntries.reduce((s, e) => s + e.durationMinutes, 0) / 60) * 10
                    ) / 10}h total`}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openLogging(9)}
            >
              + Backfill Hour
            </button>
          </div>

          {loadingDay ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Loading timeline...
            </div>
          ) : (
            <TimelineView
              timeline={dayTimeline}
              currentHour={-1}
              onAddEntry={openLogging}
              onEditEntry={openEditing}
            />
          )}
        </section>

        {/* Modal */}
        {isModalOpen && loggingHour !== null && (
          <LoggingModal
            hour={loggingHour}
            date={selectedDate}
            categories={categories}
            existingEntries={dayEntries.filter((e) => Math.floor(e.startMinute / 60) === loggingHour)}
            editingEntry={editingEntry}
            onClose={closeModal}
            onSaved={handleSaved}
          />
        )}
      </div>
    </div>
  );
}
