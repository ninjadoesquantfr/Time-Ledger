'use client';

import { OnThisDayEntry } from '@/types';
import styles from './OnThisDayPanel.module.css';

interface Props {
  entries: OnThisDayEntry[];
  className?: string;
}

export default function OnThisDayPanel({ entries, className }: Props) {
  if (!entries || entries.length === 0) return null;

  return (
    <div className={`${styles.card} ${className || ''}`}>
      <div className={styles.header}>
        <svg
          className={styles.icon}
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 2v4M10 14v4M2 10h4M14 10h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 7v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className={styles.title}>On This Day</span>
      </div>

      <div className={styles.grid}>
        {entries.map((item) => (
          <div key={item.date} className={styles.item}>
            <div className={styles.labelRow}>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.itemDate}>{item.date}</span>
            </div>
            <div className={styles.summary}>{item.summary || 'No major logged activities'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
