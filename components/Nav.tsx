'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'games' },
  { href: '/chat', label: 'Chat', icon: 'chat' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-4 bg-surface-lowest px-4 shadow-[0_1px_8px_rgba(0,0,0,0.4)] xl:px-8">
      <span className="font-display text-lg font-bold tracking-tight text-brand">Indie Games</span>
      {/* One element for both layouts: links in the header, then a fixed sidebar from xl up. */}
      <nav
        aria-label="Main"
        className="xl:fixed xl:top-16 xl:bottom-0 xl:left-0 xl:w-64 xl:bg-surface-low xl:px-2 xl:py-4 xl:shadow-[4px_0_24px_rgba(0,0,0,0.35)]"
      >
        <ul className="flex gap-1 xl:flex-col">
          {LINKS.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none ${
                    active ? 'bg-brand font-semibold text-on-brand' : 'text-muted hover:bg-surface-high hover:text-foreground'
                  }`}
                >
                  <Icon name={icon} className="hidden size-5 xl:block" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
