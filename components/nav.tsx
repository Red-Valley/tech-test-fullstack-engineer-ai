"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/chat", label: "Chat" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex gap-1">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
