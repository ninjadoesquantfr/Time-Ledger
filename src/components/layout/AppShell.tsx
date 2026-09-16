'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { href: '/today',      label: 'Today',      icon: TodayIcon },
  { href: '/log',        label: 'Log Today',  icon: LogIcon },
  { href: '/history',    label: 'History',    icon: HistoryIcon },
  { href: '/statistics', label: 'Statistics', icon: StatsIcon },
] as const;

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke={active ? '#2563EB' : 'currentColor'} strokeWidth="1.5" />
      <path d="M10 6.5V10l2.5 1.5" stroke={active ? '#2563EB' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke={active ? '#2563EB' : 'currentColor'} strokeWidth="1.5" />
      <path d="M10 7v6M7 10h6" stroke={active ? '#2563EB' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="14" height="12" rx="2" stroke={active ? '#2563EB' : 'currentColor'} strokeWidth="1.5" />
      <path d="M3 8h14M7 3v4M13 3v4" stroke={active ? '#2563EB' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StatsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 14l4-4 3 3 4-5 3 2" stroke={active ? '#2563EB' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 17h14" stroke={active ? '#2563EB' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 1.5v1.75M9 14.75V16.5M1.5 9h1.75M14.75 9H16.5M3.58 3.58l1.24 1.24M13.18 13.18l1.24 1.24M14.42 3.58l-1.24 1.24M4.82 13.18l-1.24 1.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <nav className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.sidebarTop}>
          <Link href="/today" className={styles.sidebarBrand} aria-label="Time Ledger home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect width="24" height="24" rx="6" fill="#0F172A" />
              <path d="M12 5v7.5l4.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12.5" r="6" stroke="#2563EB" strokeWidth="1.25" />
            </svg>
            <span className={styles.brandName}>Time Ledger</span>
          </Link>

          <ul className={styles.navList} role="list">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/today' && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon active={active} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.sidebarBottom}>
          <Link href="/settings" className={`${styles.navItem} ${pathname.startsWith('/settings') ? styles.navItemActive : ''}`}>
            <SettingsIcon />
            <span>Settings</span>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn} id="logout-btn">
            Sign out
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main className="app-main" id="main-content">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/today' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.bottomNavItem} ${active ? styles.bottomNavItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon active={active} />
              <span className={styles.bottomNavLabel}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
