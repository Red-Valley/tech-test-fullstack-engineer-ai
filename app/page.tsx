import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { DashboardView } from '@/components/dashboard-view';

// Next.js's title.template propagates only to nested segments, not to the
// root segment's own page (which lives at the same depth as the root
// layout). /chat receives the templated form because it is one segment
// deeper; the dashboard hardcodes the brand suffix for parity.
export const metadata: Metadata = { title: 'Dashboard • Indie Games' };

export default function HomePage(): ReactElement {
  return <DashboardView />;
}
