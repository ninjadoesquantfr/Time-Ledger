import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s — Time Ledger',
    default: 'Time Ledger',
  },
  description: 'A personal time ledger. Record where your time actually went.',
  keywords: ['time tracking', 'time ledger', 'time log', 'personal analytics'],
  robots: 'noindex, nofollow', // Personal app — not for public indexing
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
