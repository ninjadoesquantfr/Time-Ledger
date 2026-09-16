'use client';

import { HourSlot, TimeEntryData } from '@/types';
import { formatHour, formatDuration } from '@/lib/time-utils';
import EntryPill from './EntryPill';
import styles from './HourBlock.module.css';

interface Props {
  slot: HourSlot;
  isCurrent: boolean;
  onAdd: () => void;
  onEdit: (entry: TimeEntryData) => void;
  readOnly?: boolean;
}

export default function HourBlock({ slot, isCurrent, onAdd, onEdit, readOnly }: Props) {
  const isEmpty = slot.entries.length === 0;
  const hasRoom = slot.remainingMinutes > 0;

  return (
    <div
      className={`${styles.row} ${isCurrent ? styles.current : ''}`}
      role="listitem"
      aria-label={`${formatHour(slot.hour)}${isCurrent ? ' (current hour)' : ''}`}
    >
      {/* Hour label */}
      <div className={styles.hourLabel} aria-hidden="true">
        <span className={styles.hourText}>{formatHour(slot.hour)}</span>
        {isCurrent && <span className={styles.nowDot} aria-label="Current hour" />}
      </div>

      {/* Content area */}
      <div className={styles.content}>
        {isEmpty ? (
          /* Empty state */
          readOnly ? (
            <div className={styles.emptyReadOnly}>—</div>
          ) : (
            <button
              className={styles.addBtn}
              onClick={onAdd}
              aria-label={`Add entry for ${formatHour(slot.hour)}`}
              id={`add-hour-${slot.hour}`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Add
            </button>
          )
        ) : (
          /* Entry pills */
          <div className={styles.entries}>
            {slot.entries.map((entry) => (
              <EntryPill
                key={entry.id}
                entry={entry}
                onClick={() => !readOnly && onEdit(entry)}
                readOnly={readOnly}
              />
            ))}

            {/* Add split button if room remains */}
            {!readOnly && hasRoom && (
              <button
                className={styles.splitBtn}
                onClick={onAdd}
                aria-label={`Add another entry to ${formatHour(slot.hour)} (${slot.remainingMinutes}min remaining)`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {slot.remainingMinutes}min left
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fill indicator bar */}
      <div className={styles.fillBar} aria-hidden="true">
        <div
          className={styles.fillBarInner}
          style={{ height: `${Math.min(100, (slot.totalMinutes / 60) * 100)}%` }}
        />
      </div>
    </div>
  );
}
