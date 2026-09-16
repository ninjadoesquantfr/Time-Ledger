'use client';

import { useState, useMemo } from 'react';
import { CategoryWithSubs } from '@/types';
import styles from './CategoryPicker.module.css';

interface Props {
  categories: CategoryWithSubs[];
  onSelect: (catId: string, isUnaccounted: boolean) => void;
}

export default function CategoryPicker({ categories, onSelect }: Props) {
  const [query, setQuery] = useState('');

  // Find system "Unaccounted" category if exists, otherwise fallback
  const unaccountedCat = categories.find(
    (c) => c.name.toLowerCase() === 'unaccounted' || (c.isSystem && c.name === 'Unaccounted')
  );

  // Filter regular categories (exclude Unaccounted from main grid so it's placed separately)
  const regularCategories = useMemo(() => {
    return categories.filter((c) => c.name.toLowerCase() !== 'unaccounted');
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return regularCategories;
    const q = query.toLowerCase().trim();
    return regularCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [regularCategories, query]);

  function handleUnaccountedClick() {
    if (unaccountedCat) {
      onSelect(unaccountedCat.id, true);
    } else if (categories.length > 0) {
      // Fallback to first category flagged as unaccounted
      onSelect(categories[0].id, true);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchWrapper}>
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM14 14l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Filter categories or subcategories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.grid}>
        {filteredCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={styles.categoryBtn}
            onClick={() => onSelect(cat.id, false)}
          >
            <span
              className={styles.colorDot}
              style={{ backgroundColor: cat.color }}
              aria-hidden="true"
            />
            <div className={styles.catInfo}>
              <span className={styles.catName}>{cat.name}</span>
              {cat.subcategories.length > 0 && (
                <span className={styles.subCount}>
                  {cat.subcategories.length} sub{cat.subcategories.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <hr className={styles.divider} />

      {/* Unaccounted Option - distinct, non-judgmental */}
      <button
        type="button"
        className={styles.unaccountedBtn}
        onClick={handleUnaccountedClick}
      >
        <div className={styles.unaccountedIcon}>?</div>
        <div>
          <div className={styles.unaccountedTitle}>Unaccounted</div>
          <div className={styles.unaccountedDesc}>
            Don&apos;t remember or didn&apos;t keep track. Distinct from not logged.
          </div>
        </div>
      </button>
    </div>
  );
}
