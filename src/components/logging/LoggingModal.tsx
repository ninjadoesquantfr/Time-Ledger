'use client';

import { useState, useEffect, useCallback } from 'react';
import { CategoryWithSubs, TimeEntryData } from '@/types';
import { formatHour, formatDuration, minutesToTime, timeToMinutes, distributeAcrossHours } from '@/lib/time-utils';
import CategoryPicker from './CategoryPicker';
import styles from './LoggingModal.module.css';

type Step = 'category' | 'details';

interface SplitEntry {
  categoryId: string;
  subcategoryId: string;
  durationMinutes: number;
  note: string;
}

interface Props {
  hour: number;
  date: string;
  categories: CategoryWithSubs[];
  existingEntries: TimeEntryData[];
  editingEntry: TimeEntryData | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function LoggingModal({ hour, date, categories, existingEntries, editingEntry, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>(editingEntry ? 'details' : 'category');
  const [selectedCategoryId, setSelectedCategoryId] = useState(editingEntry?.categoryId ?? '');
  const [selectedSubcatId, setSelectedSubcatId] = useState(editingEntry?.subcategoryId ?? '');
  const [durationMinutes, setDurationMinutes] = useState(editingEntry?.durationMinutes ?? 60);
  const [note, setNote] = useState(editingEntry?.note ?? '');
  const [isUnaccounted, setIsUnaccounted] = useState(editingEntry?.isUnaccounted ?? false);
  const [useSpecificTime, setUseSpecificTime] = useState(false);
  const [startTime, setStartTime] = useState(`${String(hour).padStart(2, '0')}:00`);
  const [endTime, setEndTime] = useState(`${String(hour + 1 > 23 ? 23 : hour + 1).padStart(2, '0')}:00`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overlapAction, setOverlapAction] = useState<'none' | 'prompt'>('none');
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([]);
  const [showSplit, setShowSplit] = useState(false);

  const usedMinutes = existingEntries
    .filter((e) => !editingEntry || e.id !== editingEntry.id)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  const maxMinutes = 60 - usedMinutes;

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const subcats = selectedCategory?.subcategories ?? [];

  useEffect(() => {
    if (durationMinutes > maxMinutes && maxMinutes > 0) {
      setDurationMinutes(maxMinutes);
    }
  }, [maxMinutes]);

  function handleCategorySelect(catId: string, isUnacct: boolean) {
    setSelectedCategoryId(catId);
    setIsUnaccounted(isUnacct);
    setSelectedSubcatId('');
    setStep('details');
  }

  async function handleSave() {
    setError('');
    setSaving(true);

    try {
      let payload: object;
      let apiUrl = '/api/entries';
      let method = 'POST';

      if (editingEntry) {
        method = 'PUT';
        apiUrl = `/api/entries/${editingEntry.id}`;
        payload = {
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcatId || null,
          durationMinutes,
          note: note.trim() || null,
          isUnaccounted,
        };
      } else if (useSpecificTime) {
        // Distribute across hour buckets
        const startMin = timeToMinutes(startTime);
        const endMin = timeToMinutes(endTime);
        if (endMin <= startMin) {
          setError('End time must be after start time.');
          setSaving(false);
          return;
        }
        const buckets = distributeAcrossHours(startMin, endMin);
        payload = {
          date,
          buckets,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcatId || null,
          note: note.trim() || null,
          isUnaccounted,
        };
        apiUrl = '/api/entries/range';
      } else {
        payload = {
          date,
          startMinute: hour * 60,
          durationMinutes,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcatId || null,
          note: note.trim() || null,
          isUnaccounted,
        };
      }

      const csrfRes = await fetch('/api/auth/csrf');
      const { token } = await csrfRes.json();

      const res = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Overlap detected — show prompt
        setError(`This overlaps with an existing entry. Please adjust the duration (max ${data.maxMinutes}min for this hour).`);
        if (data.maxMinutes > 0) setDurationMinutes(data.maxMinutes);
        setSaving(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setSaving(false);
        return;
      }

      onSaved();
    } catch {
      setError('Unable to save. Please try again.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingEntry) return;
    setSaving(true);
    try {
      const csrfRes = await fetch('/api/auth/csrf');
      const { token } = await csrfRes.json();
      const res = await fetch(`/api/entries/${editingEntry.id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': token },
      });
      if (res.ok) {
        onSaved();
      } else {
        setError('Could not delete entry. Please try again.');
        setSaving(false);
      }
    } catch {
      setError('Unable to delete. Please try again.');
      setSaving(false);
    }
  }

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  return (
    <>
      {/* Backdrop */}
      <div className="overlay" onClick={onClose} aria-hidden="true" />

      {/* Sheet / Modal */}
      <div
        className={isDesktop ? `modal ${styles.desktopModal}` : `bottom-sheet ${styles.sheet}`}
        role="dialog"
        aria-modal="true"
        aria-label={editingEntry ? 'Edit entry' : `Log ${formatHour(hour)}`}
      >
        {!isDesktop && <div className="bottom-sheet-handle" aria-hidden="true" />}

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {editingEntry ? 'Edit entry' : step === 'category' ? `Log ${formatHour(hour)}` : selectedCategory?.name ?? 'Log entry'}
            </h2>
            <p className={styles.subtitle}>
              {date} · {formatHour(hour)}
              {maxMinutes < 60 && step === 'details' && ` · ${maxMinutes}min available`}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close" id="close-logging-modal">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <hr className="divider" />

        {/* Step: Category picker */}
        {step === 'category' && (
          <CategoryPicker
            categories={categories}
            onSelect={handleCategorySelect}
          />
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className={styles.details}>
            {/* Back button if not editing */}
            {!editingEntry && (
              <button className={`btn btn-ghost btn-sm ${styles.backBtn}`} onClick={() => setStep('category')}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            )}

            {/* Category display */}
            {selectedCategory && (
              <div className={styles.catDisplay}>
                <span className="cat-dot" style={{ background: selectedCategory.color }} aria-hidden="true" />
                <span className={styles.catName}>{selectedCategory.name}</span>
                {!editingEntry && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setStep('category')} style={{ marginLeft: 'auto', fontSize: 12 }}>
                    Change
                  </button>
                )}
              </div>
            )}

            {/* Subcategory */}
            {subcats.length > 0 && !isUnaccounted && (
              <div className="form-group">
                <label className="form-label" htmlFor="subcat-select">Subcategory <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <div className={styles.subcatGrid}>
                  {subcats.map((s) => (
                    <button
                      key={s.id}
                      id={`subcat-${s.id}`}
                      className={`${styles.subcatChip} ${selectedSubcatId === s.id ? styles.subcatChipActive : ''}`}
                      onClick={() => setSelectedSubcatId(selectedSubcatId === s.id ? '' : s.id)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Specific time toggle */}
            {!editingEntry && (
              <div className={styles.timeToggle}>
                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={useSpecificTime}
                    onChange={(e) => setUseSpecificTime(e.target.checked)}
                    id="specific-time-toggle"
                  />
                  <span className={styles.toggleLabel}>Specific time range</span>
                </label>
              </div>
            )}

            {/* Time inputs or duration */}
            {useSpecificTime && !editingEntry ? (
              <div className={styles.timeRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="start-time">From</label>
                  <input
                    id="start-time"
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className={styles.timeSep}>to</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="end-time">To</label>
                  <input
                    id="end-time"
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="duration-input">
                  Duration · <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{formatDuration(durationMinutes)}</span>
                </label>
                <input
                  id="duration-input"
                  type="range"
                  className={styles.durationSlider}
                  min={5}
                  max={maxMinutes > 0 ? maxMinutes : 60}
                  step={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
                <div className={styles.durationHints}>
                  <span>5 min</span>
                  <span>{formatDuration(maxMinutes > 0 ? maxMinutes : 60)} max</span>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="form-group">
              <label className="form-label" htmlFor="entry-note">
                Note <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
              </label>
              <input
                id="entry-note"
                type="text"
                className="form-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any context…"
                maxLength={200}
              />
            </div>

            {error && (
              <div className={styles.error} role="alert">{error}</div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              <button
                id="save-entry-btn"
                className="btn btn-primary btn-md"
                onClick={handleSave}
                disabled={saving || !selectedCategoryId}
                style={{ flex: 1 }}
              >
                {saving ? <><span className="spinner" aria-hidden="true" /> Saving…</> : editingEntry ? 'Save changes' : 'Log time'}
              </button>

              {editingEntry && (
                <button
                  id="delete-entry-btn"
                  className="btn btn-danger btn-md"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
