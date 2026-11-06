'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { Game } from '@/lib/types';
import { DeleteButton } from './DeleteButton';

const COPY_MESSAGE_MS = 2000;
const COPY_MESSAGES = { idle: '', copied: 'Copied', failed: 'Copy failed' };

export function GameActions({ game, onEdit }: { game: Game; onEdit: () => void }) {
  const [copy, setCopy] = useState<keyof typeof COPY_MESSAGES>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyJson() {
    let result: 'copied' | 'failed' = 'copied';
    try {
      await navigator.clipboard.writeText(JSON.stringify(game, null, 2));
    } catch (error) {
      // The clipboard needs a secure context and the browser's permission.
      console.error('[games] could not copy to the clipboard', error);
      result = 'failed';
    }
    setCopy(result);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopy('idle'), COPY_MESSAGE_MS);
  }

  return (
    <div className="relative flex items-center justify-end gap-1.5">
      {/* Floats above the buttons, so that it doesn't resize the table's columns. */}
      <span
        role="status"
        className={`absolute right-0 bottom-full z-10 mb-1 rounded-md bg-surface-highest px-2 py-1 text-xs whitespace-nowrap empty:p-0 ${copy === 'failed' ? 'text-error' : 'text-tertiary'}`}
      >
        {COPY_MESSAGES[copy]}
      </span>
      <Link
        prefetch={false}
        href={`/chat?ask=${encodeURIComponent(game.title)}`}
        aria-label={`Ask AI about ${game.title}`}
        title="Ask AI"
        className="inline-flex size-9 items-center justify-center rounded-lg bg-surface-highest text-brand hover:bg-surface-high focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <Icon name="sparkle" />
      </Link>
      <Button aria-label={`Copy ${game.title} as JSON`} title="Copy JSON" variant="icon" className="text-foreground" onClick={copyJson}>
        <Icon name={copy === 'copied' ? 'check' : 'copy'} />
      </Button>
      <Button aria-label={`Edit ${game.title}`} title="Edit" variant="icon" className="text-secondary" onClick={onEdit}>
        <Icon name="edit" />
      </Button>
      <DeleteButton game={game} />
    </div>
  );
}
