'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatHour, formatDuration } from '@/lib/time-utils';
import styles from './statistics.module.css';

interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalMinutes: number;
  percentage: number;
  subcategoryTotals: Array<{
    subcategoryId: string | null;
    subcategoryName: string | null;
    totalMinutes: number;
    percentage: number;
  }>;
}

interface StatsData {
  period: { start: string; end: string; label: string };
  totals: {
    loggedMinutes: number;
    unaccountedMinutes: number;
    unloggedMinutes: number;
    totalPossibleMinutes: number;
  };
  daysLogged: number;
  totalDays: number;
  categoryTotals: CategoryTotal[];
  hourOfDayMinutes: number[];
  streak: { current: number; max: number };
}

const PERIODS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'year', label: '1 Year' },
  { key: 'all', label: 'All Time' },
];

export default function StatisticsClient() {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async (p: string) => {
    setLoading(true);
    const res = await fetch(`/api/stats?period=${p}`);
    if (res.ok) {
      const result = await res.json();
      setData(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats(period);
  }, [period, loadStats]);

  const maxHourMinutes = data ? Math.max(...data.hourOfDayMinutes, 1) : 1;

  return (
    <div className={styles.page}>
      <div className="page-container">
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Statistics</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Objective breakdown of where your time went. Always non-judgmental.
            </p>
          </div>

          <div className={styles.periodSelector} role="radiogroup" aria-label="Select period">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`${styles.periodBtn} ${period === p.key ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading statistics...
          </div>
        ) : !data ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No statistics data available.
          </div>
        ) : (
          <>
            {/* Top 3 Metric Cards — Distinct: Logged vs Unaccounted vs Not Logged */}
            <div className={styles.topMetricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Logged Time</div>
                <div className={styles.metricValue}>
                  {Math.round((data.totals.loggedMinutes / 60) * 10) / 10}h
                </div>
                <div className={styles.metricSub}>
                  {data.totals.totalPossibleMinutes > 0
                    ? `${Math.round((data.totals.loggedMinutes / data.totals.totalPossibleMinutes) * 100)}% of total period`
                    : '0%'}
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricLabel} style={{ color: '#64748B' }}>
                  Unaccounted Time
                </div>
                <div className={styles.metricValue} style={{ color: '#475569' }}>
                  {Math.round((data.totals.unaccountedMinutes / 60) * 10) / 10}h
                </div>
                <div className={styles.metricSub}>
                  User marked as &quot;don&apos;t know&quot;
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricLabel} style={{ color: '#94A3B8' }}>
                  Not Logged
                </div>
                <div className={styles.metricValue} style={{ color: '#94A3B8' }}>
                  {Math.round((data.totals.unloggedMinutes / 60) * 10) / 10}h
                </div>
                <div className={styles.metricSub}>
                  Unfilled hours in timeline
                </div>
              </div>
            </div>

            {/* Consistency & Streak Banner */}
            <div
              className={styles.card}
              style={{
                marginBottom: 'var(--space-6)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-around',
                gap: 'var(--space-4)',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  DAYS LOGGED
                </div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
                  {data.daysLogged} / {data.totalDays}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  CURRENT STREAK
                </div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {data.streak.current} day{data.streak.current === 1 ? '' : 's'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  LONGEST STREAK
                </div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
                  {data.streak.max} day{data.streak.max === 1 ? '' : 's'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  AVG LOGGED / DAY
                </div>
                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)' }}>
                  {data.totalDays > 0
                    ? `${Math.round((data.totals.loggedMinutes / data.totalDays / 60) * 10) / 10}h`
                    : '0h'}
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className={styles.chartsGrid}>
              {/* Category Breakdown */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Category Breakdown</h2>

                {data.categoryTotals.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                    No categorized time recorded in this period.
                  </p>
                ) : (
                  <div className={styles.categoryList}>
                    {data.categoryTotals.map((cat) => (
                      <div key={cat.categoryId} className={styles.categoryRow}>
                        <div className={styles.catRowHeader}>
                          <div className={styles.catRowLeft}>
                            <span
                              className={styles.catDot}
                              style={{ backgroundColor: cat.categoryColor }}
                            />
                            <span className={styles.catName}>{cat.categoryName}</span>
                          </div>
                          <div className={styles.catStats}>
                            <span>{Math.round((cat.totalMinutes / 60) * 10) / 10}h</span>
                            <span
                              style={{
                                color: 'var(--color-text-muted)',
                                marginLeft: '6px',
                                fontSize: 'var(--text-xs)',
                              }}
                            >
                              ({cat.percentage}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: cat.categoryColor,
                            }}
                          />
                        </div>

                        {/* Subcategories list */}
                        {cat.subcategoryTotals.length > 0 && (
                          <div className={styles.subcatList}>
                            {cat.subcategoryTotals.map((sub) => (
                              <span
                                key={sub.subcategoryId || sub.subcategoryName}
                                className={styles.subcatItem}
                              >
                                {sub.subcategoryName}: {formatDuration(sub.totalMinutes)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hour of Day Distribution */}
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Hour of Day Heatmap (12 AM – 11 PM)</h2>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Total minutes logged in each hour bucket across all days in the period.
                </p>

                <div className={styles.hourGrid}>
                  {data.hourOfDayMinutes.map((mins, hour) => {
                    const heightPct = Math.round((mins / maxHourMinutes) * 100);
                    return (
                      <div key={hour} className={styles.hourCol}>
                        <div className={styles.hourBarArea} title={`${formatHour(hour)}: ${mins} minutes logged`}>
                          <div
                            className={styles.hourBarFill}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className={styles.hourLabel}>{hour}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
