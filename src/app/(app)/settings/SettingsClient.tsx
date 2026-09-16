'use client';

import { useState } from 'react';
import { CategoryWithSubs } from '@/types';
import styles from './settings.module.css';

interface Props {
  initialCategories: CategoryWithSubs[];
  initialNotificationPrefs: { enabled: boolean; frequency: string };
}

export default function SettingsClient({ initialCategories, initialNotificationPrefs }: Props) {
  const [categories, setCategories] = useState<CategoryWithSubs[]>(initialCategories);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366F1');
  const [newSubcatNames, setNewSubcatNames] = useState<Record<string, string>>({});
  const [notificationPrefs, setNotificationPrefs] = useState(initialNotificationPrefs);
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [importPreview, setImportPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function getCsrfToken() {
    const res = await fetch('/api/auth/csrf');
    const data = await res.json();
    return data.token;
  }

  // Add Category
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const token = await getCsrfToken();
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) => [...prev, { ...data.category, subcategories: [] }]);
      setNewCatName('');
    }
  }

  // Update Category (Name or Color or Archive)
  async function handleUpdateCategory(id: string, updates: { name?: string; color?: string; archived?: boolean }) {
    const token = await getCsrfToken();
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data.category } : c))
      );
    }
  }

  // Add Subcategory
  async function handleAddSubcategory(categoryId: string) {
    const name = newSubcatNames[categoryId]?.trim();
    if (!name) return;
    const token = await getCsrfToken();
    const res = await fetch('/api/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ categoryId, name }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: [...c.subcategories, data.subcategory] }
            : c
        )
      );
      setNewSubcatNames((prev) => ({ ...prev, [categoryId]: '' }));
    }
  }

  // Archive Subcategory
  async function handleArchiveSubcategory(categoryId: string, subcategoryId: string) {
    const token = await getCsrfToken();
    const res = await fetch(`/api/subcategories?id=${subcategoryId}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': token },
    });
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subcategoryId) }
            : c
        )
      );
    }
  }

  // Save Notifications
  async function handleSaveNotifications(enabled: boolean, frequency: string) {
    setNotificationPrefs({ enabled, frequency });
    const token = await getCsrfToken();
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ enabled, frequency }),
    });
  }

  // Dry Run Import
  async function handlePreviewImport() {
    if (!importJson.trim()) return;
    setImportStatus('Validating...');
    const token = await getCsrfToken();
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ data: importJson, dryRun: true }),
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      setImportPreview(data.preview);
      setImportStatus(`Valid payload: ${data.preview.entriesCount} entries found.`);
    } else {
      setImportStatus(`Validation failed: ${data.error || 'Invalid format'}`);
    }
  }

  // Execute Import
  async function handleExecuteImport() {
    if (!importJson.trim()) return;
    setSaving(true);
    setImportStatus('Importing entries...');
    const token = await getCsrfToken();
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify({ data: importJson, dryRun: false }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setImportStatus(`Successfully imported ${data.importedEntriesCount} entries!`);
      setImportPreview(null);
      setImportJson('');
    } else {
      setImportStatus(`Import failed: ${data.error}`);
    }
  }

  return (
    <div className={styles.page}>
      <div className="page-container">
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>
            Manage your ledger categories, export backups, and configure notification preferences.
          </p>
        </header>

        {/* Section 1: Categories & Subcategories */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Categories &amp; Subcategories</h2>
          <p className={styles.sectionDesc}>
            Customize your activity buckets. Archiving hides a category from the logger while
            preserving all past entries intact.
          </p>

          <div className={styles.categoryList}>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={styles.categoryCard}
                style={{ opacity: cat.archived ? 0.6 : 1 }}
              >
                <div className={styles.catRow}>
                  <div className={styles.catLeft}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={cat.color}
                      onChange={(e) => handleUpdateCategory(cat.id, { color: e.target.value })}
                      title="Change category color"
                    />
                    <input
                      type="text"
                      className={styles.catNameInput}
                      defaultValue={cat.name}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== cat.name) {
                          handleUpdateCategory(cat.id, { name: e.target.value.trim() });
                        }
                      }}
                    />
                    {cat.isSystem && (
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        SYSTEM
                      </span>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleUpdateCategory(cat.id, { archived: !cat.archived })}
                    >
                      {cat.archived ? 'Unarchive' : 'Archive'}
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                <div className={styles.subcatContainer}>
                  <div className={styles.subcatChips}>
                    {cat.subcategories.map((sub) => (
                      <span key={sub.id} className={styles.subcatChip}>
                        {sub.name}
                        <button
                          type="button"
                          className={styles.deleteSubBtn}
                          onClick={() => handleArchiveSubcategory(cat.id, sub.id)}
                          aria-label={`Remove ${sub.name}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}

                    {/* Add Subcategory */}
                    <div className={styles.addSubForm}>
                      <input
                        type="text"
                        className={styles.addSubInput}
                        placeholder="+ subcategory"
                        value={newSubcatNames[cat.id] || ''}
                        onChange={(e) =>
                          setNewSubcatNames({ ...newSubcatNames, [cat.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubcategory(cat.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => handleAddSubcategory(cat.id)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className={styles.addCategoryForm}>
            <input
              type="color"
              className={styles.colorPicker}
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              title="Pick color"
            />
            <input
              type="text"
              className="input"
              placeholder="New category name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              style={{ maxWidth: '280px' }}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              + Add Category
            </button>
          </form>
        </section>

        {/* Section 2: Data Export & Import */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data Portability</h2>
          <p className={styles.sectionDesc}>
            Your time data is yours. Export full backups in CSV or JSON format anytime, or import
            historical data from other instances.
          </p>

          <div className={styles.exportButtons}>
            <a href="/api/export?format=csv" className="btn btn-secondary" download>
              Export as CSV
            </a>
            <a href="/api/export?format=json" className="btn btn-secondary" download>
              Export as JSON
            </a>
          </div>

          <hr className="divider" style={{ margin: 'var(--space-5) 0' }} />

          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
            Import Data
          </h3>
          <div className={styles.importArea}>
            <textarea
              className={styles.importTextarea}
              placeholder="Paste Time Ledger JSON export here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handlePreviewImport}
              >
                Validate &amp; Preview
              </button>
              {importPreview && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={saving}
                  onClick={handleExecuteImport}
                >
                  Confirm &amp; Import
                </button>
              )}
            </div>
            {importStatus && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {importStatus}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Reminders / Notifications */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reminders &amp; Prompts</h2>
          <p className={styles.sectionDesc}>
            Gentle neutral reminders to log where your hours went. Never judgmental.
          </p>

          <div className={styles.prefRow}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                Logging Prompts
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Enable periodic prompts to record past hours
              </div>
            </div>
            <input
              type="checkbox"
              checked={notificationPrefs.enabled}
              onChange={(e) =>
                handleSaveNotifications(e.target.checked, notificationPrefs.frequency)
              }
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>

          <div className={styles.prefRow}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                Prompt Frequency
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                How often you&apos;d like to be reminded
              </div>
            </div>
            <select
              className="input"
              style={{ width: 'auto' }}
              value={notificationPrefs.frequency}
              onChange={(e) =>
                handleSaveNotifications(notificationPrefs.enabled, e.target.value)
              }
            >
              <option value="none">None</option>
              <option value="1h">Every 1 hour</option>
              <option value="2h">Every 2 hours</option>
              <option value="few">A few times a day (morning, afternoon, evening)</option>
            </select>
          </div>
        </section>
      </div>
    </div>
  );
}
