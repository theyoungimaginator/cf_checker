import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CF Ledger — Codeforces problem tracker',
  description: 'A clean, free tracker for your accepted Codeforces problems and submission links.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
