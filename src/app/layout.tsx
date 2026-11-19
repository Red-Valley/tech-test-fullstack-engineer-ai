import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
    title: 'IndiePulse — Indie Games Catalog & AI Analyst',
    description: 'Internal indie games catalog dashboard with LangGraph tool-calling AI assistant',
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('indiepulse_theme');
    var theme = (t === 'light' || t === 'dark') ? t : 'dark';
    var root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
            </head>
            <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased transition-colors dark:bg-zinc-950 dark:text-zinc-100">
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
