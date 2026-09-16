'use client';

import { TimeEntryData } from '@/types';
import { formatDuration } from '@/lib/time-utils';
import styles from './EntryPill.module.css';

interface Props {
  entry: TimeEntryData;
  onClick: () => void;
  readOnly?: boolean;
}

export default function EntryPill({ entry, onClick, readOnly }: Props) {
  const label = entry.isUnaccounted
    ? 'Unaccounted'
    : entry.subcategoryName
    ? `${entry.categoryName} → ${entry.subcategoryName}`
    : entry.categoryName;

  return (
    <button
      className={`${styles.pill} ${readOnly ? styles.readOnly : ''}`}
      onClick={onClick}
      disabled={readOnly}
      aria-label={`${label}, ${formatDuration(entry.durationMinutes)}${entry.note ? `, note: ${entry.note}` : ''}`}
      title={entry.note ?? undefined}
    >
      {/* Category color dot */}
      <span
        className={styles.dot}
        style={{ background: entry.categoryColor }}
        aria-hidden="true"
      />

      {/* Label */}
      <span className={styles.label}>{label}</span>

      {/* Duration */}
      <span className={styles.duration}>{formatDuration(entry.durationMinutes)}</span>

      {/* Note indicator */}
      {entry.note && (
        <span className={styles.noteIcon} aria-hidden="true" title={entry.note}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2h6M2 5h4M2 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      )}

      {/* Edit chevron */}
      {!readOnly && (
        <span className={styles.editIcon} aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3.5 2l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}
