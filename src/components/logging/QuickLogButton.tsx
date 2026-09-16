'use client';

import { useState } from 'react';
import { CategoryWithSubs } from '@/types';
import { formatHour } from '@/lib/time-utils';
import LoggingModal from './LoggingModal';
import styles from './QuickLogButton.module.css';

interface Props {
  currentHour: number;
  categories: CategoryWithSubs[];
  date: string;
  onSaved: () => void;
}

export default function QuickLogButton({ currentHour, categories, date, onSaved }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={styles.floatingWrapper}>
        <button
          type="button"
          className={styles.quickBtn}
          onClick={() => setIsOpen(true)}
          aria-label={`Quick log ${formatHour(currentHour)}`}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className={styles.btnText}>Quick Log {formatHour(currentHour)}</span>
        </button>
      </div>

      {isOpen && (
        <LoggingModal
          hour={currentHour}
          date={date}
          categories={categories}
          existingEntries={[]}
          editingEntry={null}
          onClose={() => setIsOpen(false)}
          onSaved={() => {
            setIsOpen(false);
            onSaved();
          }}
        />
      )}
    </>
  );
}
