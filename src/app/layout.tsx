import type { Metadata } from 'next';
import Link from 'next/link';
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-400-italic.css';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Between the lines — a personal journal', template: '%s — Between the lines' }, description: 'A few pages of a life, shared slowly.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><a className="skip-link" href="#main">Skip to the page</a><header className="site-header"><Link href="/" className="wordmark"><span className="ink-mark">b.</span> BETWEEN THE LINES</Link><span className="header-note">a personal journal</span></header><main id="main">{children}</main><footer className="site-footer"><span>Written in memory. Read with care.</span><span>A LITTLE LIFE, IN WORDS</span></footer></body></html>; }
