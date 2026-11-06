'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/chat', label: 'Chat' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <span className="font-semibold">Indie Games</span>
        <ul className="flex gap-4">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-md px-2 py-1 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                    active ? 'font-medium text-brand' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
