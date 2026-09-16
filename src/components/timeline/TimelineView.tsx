'use client';

import { DayTimeline, TimeEntryData } from '@/types';
import { formatHour } from '@/lib/time-utils';
import HourBlock from './HourBlock';
import styles from './TimelineView.module.css';

interface Props {
  timeline: DayTimeline;
  currentHour?: number;
  onAddEntry: (hour: number) => void;
  onEditEntry: (entry: TimeEntryData) => void;
  readOnly?: boolean;
}

export default function TimelineView({ timeline, currentHour, onAddEntry, onEditEntry, readOnly = false }: Props) {
  return (
    <div className={styles.timeline} role="list" aria-label="24-hour timeline">
      {timeline.map((slot) => (
        <HourBlock
          key={slot.hour}
          slot={slot}
          isCurrent={slot.hour === currentHour}
          onAdd={() => !readOnly && onAddEntry(slot.hour)}
          onEdit={(entry) => !readOnly && onEditEntry(entry)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
