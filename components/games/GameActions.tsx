'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { Game } from '@/lib/types';
import { DeleteButton } from './DeleteButton';

const ICON_BUTTON = 'size-9 p-0!';
const COPY_MESSAGE_MS = 2000;
const COPY_MESSAGES = { idle: '', copied: 'Copied', failed: 'Copy failed' };

export function GameActions({ game, onEdit }: { game: Game; onEdit: () => void }) {
  const [copy, setCopy] = useState<keyof typeof COPY_MESSAGES>('idle');

  useEffect(() => {
    if (copy === 'idle') return;
    const timer = setTimeout(() => setCopy('idle'), COPY_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [copy]);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(game, null, 2));
      setCopy('copied');
    } catch (error) {
      // The clipboard needs a secure context and the browser's permission.
      console.error('[games] could not copy to the clipboard', error);
      setCopy('failed');
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span role="status" className={`text-xs ${copy === 'failed' ? 'text-error' : 'text-tertiary'}`}>
        {COPY_MESSAGES[copy]}
      </span>
      <Link
        href={`/chat?ask=${encodeURIComponent(game.title)}`}
        aria-label={`Ask AI about ${game.title}`}
        title="Ask AI"
        className="inline-flex size-9 items-center justify-center rounded-lg bg-surface-highest text-brand hover:bg-surface-high focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <Icon name="sparkle" />
      </Link>
      <Button aria-label={`Copy ${game.title} as JSON`} title="Copy JSON" className={ICON_BUTTON} onClick={copyJson}>
        <Icon name={copy === 'copied' ? 'check' : 'copy'} />
      </Button>
      <Button aria-label={`Edit ${game.title}`} title="Edit" className={`${ICON_BUTTON} text-secondary`} onClick={onEdit}>
        <Icon name="edit" />
      </Button>
      <DeleteButton game={game} />
    </div>
  );
}
