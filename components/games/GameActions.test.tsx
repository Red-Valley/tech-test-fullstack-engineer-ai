import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeGame } from '@/test/game-factory';
import { GameActions } from './GameActions';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const game = makeGame({ title: 'Moss & Marrow' });

describe('GameActions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links to the chat with the title encoded', () => {
    render(<GameActions game={game} onEdit={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Ask AI about Moss & Marrow' })).toHaveAttribute('href', '/chat?ask=Moss%20%26%20Marrow');
  });

  it('copies the game as JSON and says so', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<GameActions game={game} onEdit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Copy Moss & Marrow as JSON' }));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify(game, null, 2));
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });

  it('says so when the browser denies the clipboard', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<GameActions game={game} onEdit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Copy Moss & Marrow as JSON' }));

    expect(screen.getByRole('status')).toHaveTextContent('Copy failed');
  });

  it('clears the message two seconds after the last copy', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
      render(<GameActions game={game} onEdit={vi.fn()} />);
      const copy = screen.getByRole('button', { name: 'Copy Moss & Marrow as JSON' });

      await user.click(copy);
      act(() => vi.advanceTimersByTime(1500));
      await user.click(copy);
      act(() => vi.advanceTimersByTime(1500));
      expect(screen.getByRole('status')).toHaveTextContent('Copied');

      act(() => vi.advanceTimersByTime(500));
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });
});
