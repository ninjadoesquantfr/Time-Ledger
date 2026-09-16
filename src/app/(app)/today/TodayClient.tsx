'use client';

import { useState, useCallback, useEffect } from 'react';
import { DayTimeline, TimeEntryData, CategoryWithSubs, OnThisDayEntry } from '@/types';
import { buildDayTimeline, formatDate, getCurrentHour } from '@/lib/time-utils';
import TimelineView from '@/components/timeline/TimelineView';
import LoggingModal from '@/components/logging/LoggingModal';
import OnThisDayPanel from '@/components/statistics/OnThisDayPanel';
import QuickLogButton from '@/components/logging/QuickLogButton';
import styles from './today.module.css';

interface Props {
  initialTimeline: DayTimeline;
  initialEntries: TimeEntryData[];
  categories: CategoryWithSubs[];
  today: string;
  onThisDay: OnThisDayEntry[];
}

export default function TodayClient({ initialTimeline, initialEntries, categories, today, onThisDay }: Props) {
  const [entries, setEntries] = useState<TimeEntryData[]>(initialEntries);
  const [timeline, setTimeline] = useState<DayTimeline>(initialTimeline);
  const [loggingHour, setLoggingHour] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntryData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentHour, setCurrentHour] = useState(getCurrentHour());

  // Keep current hour fresh
  useEffect(() => {
    const interval = setInterval(() => setCurrentHour(getCurrentHour()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const refreshTimeline = useCallback((updatedEntries: TimeEntryData[]) => {
    setEntries(updatedEntries);
    setTimeline(buildDayTimeline(updatedEntries));
  }, []);

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
    // Reload entries from server
    const res = await fetch(`/api/entries?date=${today}`);
    if (res.ok) {
      const data = await res.json();
      refreshTimeline(data.entries);
    }
    closeModal();
  }

  const totalLoggedMinutes = entries
    .filter((e) => !e.isUnaccounted)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  const totalUnaccounted = entries
    .filter((e) => e.isUnaccounted)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  const totalLogged = totalLoggedMinutes + totalUnaccounted;
  const loggedHours = Math.floor(totalLoggedMinutes / 60);
  const loggedMins = totalLoggedMinutes % 60;

  return (
    <div className={styles.page}>
      <div className="page-container">
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.dateTitle}>{formatDate(today)}</h1>
            <p className={styles.dateSub}>
              {totalLogged === 0 ? (
                'No time logged yet today.'
              ) : (
                <>
                  <span className={styles.loggedAmount}>
                    {loggedHours > 0 ? `${loggedHours}h ` : ''}
                    {loggedMins > 0 ? `${loggedMins}min` : ''}
                  </span>{' '}
                  logged
                  {totalUnaccounted > 0 && (
                    <>, {Math.round(totalUnaccounted / 60 * 10) / 10}h unaccounted</>
                  )}
                </>
              )}
            </p>
          </div>
        </header>

        {/* On This Day — shown only if data exists */}
        {onThisDay.length > 0 && (
          <OnThisDayPanel entries={onThisDay} className={styles.onThisDay} />
        )}

        {/* 24h Timeline */}
        <TimelineView
          timeline={timeline}
          currentHour={currentHour}
          onAddEntry={openLogging}
          onEditEntry={openEditing}
        />
      </div>

      {/* Quick Log Button */}
      <QuickLogButton
        currentHour={currentHour}
        categories={categories}
        date={today}
        onSaved={handleSaved}
      />

      {/* Logging Modal */}
      {isModalOpen && loggingHour !== null && (
        <LoggingModal
          hour={loggingHour}
          date={today}
          categories={categories}
          existingEntries={entries.filter((e) => Math.floor(e.startMinute / 60) === loggingHour)}
          editingEntry={editingEntry}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
