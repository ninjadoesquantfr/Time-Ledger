'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DayTimeline, TimeEntryData, CategoryWithSubs } from '@/types';
import { formatHour, buildDayTimeline, getCurrentHour } from '@/lib/time-utils';
import LoggingModal from '@/components/logging/LoggingModal';
import styles from './log.module.css';

interface Props {
  initialTimeline: DayTimeline;
  initialEntries: TimeEntryData[];
  categories: CategoryWithSubs[];
  today: string;
}

export default function LogClient({ initialTimeline, initialEntries, categories, today }: Props) {
  const [entries, setEntries] = useState<TimeEntryData[]>(initialEntries);
  const [timeline, setTimeline] = useState<DayTimeline>(initialTimeline);
  
  // Find first unfilled hour up to current hour
  const nowH = getCurrentHour();
  const firstUnfilled = timeline.find((s) => s.hour <= nowH && s.state !== 'full')?.hour ?? nowH;
  const [selectedHour, setSelectedHour] = useState<number>(firstUnfilled);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filledCount = timeline.filter((s) => s.state === 'full').length;
  const partialCount = timeline.filter((s) => s.state === 'partial').length;
  const progressPct = Math.round((filledCount / 24) * 100);

  const activeSlot = timeline[selectedHour];
  const activeEntries = entries.filter((e) => Math.floor(e.startMinute / 60) === selectedHour);

  async function handleReload() {
    const res = await fetch(`/api/entries?date=${today}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      const newTimeline = buildDayTimeline(data.entries);
      setTimeline(newTimeline);

      // Auto-advance to next unfilled hour up to current hour
      const nextUnfilled = newTimeline.find((s) => s.hour > selectedHour && s.state !== 'full')?.hour;
      if (nextUnfilled !== undefined) {
        setSelectedHour(nextUnfilled);
      }
    }
    setIsModalOpen(false);
  }

  return (
    <div className={styles.page}>
      <div className="page-container">
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>Log Today</h1>
          <p className={styles.subtitle}>
            Quickly fill in the hours of your day. Everything is recorded without judgment.
          </p>

          <div className={styles.progressBarWrapper}>
            <div className={styles.progressLabel}>
              <span>{filledCount} of 24 hours fully logged</span>
              <span>{progressPct}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </header>

        {/* 24-Hour Selector Ribbon */}
        <div className={styles.hourSelectorRow} role="tablist" aria-label="Hours of the day">
          {timeline.map((slot) => {
            const isSelected = slot.hour === selectedHour;
            const isFull = slot.state === 'full';
            const isPartial = slot.state === 'partial';

            let chipClass = styles.hourChip;
            if (isSelected) chipClass += ` ${styles.hourChipActive}`;
            else if (isFull) chipClass += ` ${styles.hourChipFilled}`;

            return (
              <button
                key={slot.hour}
                type="button"
                className={chipClass}
                onClick={() => setSelectedHour(slot.hour)}
                aria-selected={isSelected}
              >
                {formatHour(slot.hour)}
                {isFull ? ' ✓' : isPartial ? ` (${slot.totalMinutes}m)` : ''}
              </button>
            );
          })}
        </div>

        {/* Active Hour Card */}
        <div className={styles.stepperCard}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.currentHourBadge}>
                {formatHour(selectedHour)} – {formatHour((selectedHour + 1) % 24)}
              </div>
              <p className={styles.subtitle}>
                {activeSlot.totalMinutes === 0
                  ? 'No time recorded for this hour.'
                  : `${activeSlot.totalMinutes} minutes recorded (${activeSlot.remainingMinutes} min available).`}
              </p>
            </div>

            <span
              className={`${styles.hourStatus} ${
                activeSlot.state === 'full'
                  ? styles.statusFull
                  : activeSlot.state === 'partial'
                  ? styles.statusPartial
                  : styles.statusEmpty
              }`}
            >
              {activeSlot.state === 'full'
                ? 'Fully Logged'
                : activeSlot.state === 'partial'
                ? 'Partially Logged'
                : 'Not Logged'}
            </span>
          </div>

          {/* Existing entries for this hour */}
          {activeEntries.length > 0 && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className={styles.sectionTitle}>Recorded Entries:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {activeEntries.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: e.categoryColor,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {e.categoryName}
                        {e.subcategoryName && ` › ${e.subcategoryName}`}
                      </span>
                      {e.note && (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                          ({e.note})
                        </span>
                      )}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      {e.durationMinutes} min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className={styles.actionRow}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedHour((prev) => (prev > 0 ? prev - 1 : 23))}
              >
                ← Prev Hour
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedHour((prev) => (prev < 23 ? prev + 1 : 0))}
              >
                Next Hour →
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              {activeSlot.totalMinutes === 0 ? `+ Log ${formatHour(selectedHour)}` : '+ Add to Hour / Edit'}
            </button>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <LoggingModal
            hour={selectedHour}
            date={today}
            categories={categories}
            existingEntries={activeEntries}
            editingEntry={null}
            onClose={() => setIsModalOpen(false)}
            onSaved={handleReload}
          />
        )}
      </div>
    </div>
  );
}
