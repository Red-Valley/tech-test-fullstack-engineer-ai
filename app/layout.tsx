import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { SiteNav } from '@/components/site-nav';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Indie Games — Catalog',
  description:
    'Internal dashboard to manage an indie games catalog, with an AI chat backed by tool calling.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
