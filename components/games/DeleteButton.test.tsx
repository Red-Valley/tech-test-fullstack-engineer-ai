import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useRouter } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { DeleteButton } from './DeleteButton';

const game = { id: 7, title: 'Doomed' };

async function openConfirmation() {
  const user = userEvent.setup();
  render(<DeleteButton game={game} />);
  await user.click(screen.getByRole('button', { name: 'Delete Doomed' }));
  return user;
}

const confirm = { name: 'Delete game' };

describe('DeleteButton', () => {
  it('asks for confirmation before calling the API', async () => {
    const handler = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.delete('*/api/games/7', handler));

    await openConfirmation();

    expect(screen.getByRole('dialog', { name: 'Delete Doomed?' })).toBeInTheDocument();
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing when cancelled', async () => {
    const handler = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.delete('*/api/games/7', handler));

    const user = await openConfirmation();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(handler).not.toHaveBeenCalled();
    expect(useRouter().refresh).not.toHaveBeenCalled();
  });

  it('deletes after confirming, refreshes and closes', async () => {
    const handler = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.delete('*/api/games/7', handler));

    const user = await openConfirmation();
    await user.click(screen.getByRole('button', confirm));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(handler).toHaveBeenCalledOnce();
    expect(useRouter().refresh).toHaveBeenCalledOnce();
  });

  it('treats a 404 as already deleted', async () => {
    server.use(http.delete('*/api/games/7', () => HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 })));

    const user = await openConfirmation();
    await user.click(screen.getByRole('button', confirm));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useRouter().refresh).toHaveBeenCalledOnce();
  });

  it('keeps the dialog open with the error when the delete fails, and allows a retry', async () => {
    server.use(http.delete('*/api/games/7', () => HttpResponse.json({ error: { code: 'INTERNAL', message: 'Something went wrong' } }, { status: 500 })));

    const user = await openConfirmation();
    await user.click(screen.getByRole('button', confirm));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(useRouter().refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('button', confirm)).toBeEnabled();

    server.use(http.delete('*/api/games/7', () => new HttpResponse(null, { status: 204 })));
    await user.click(screen.getByRole('button', confirm));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('forgets a previous error when reopened', async () => {
    server.use(http.delete('*/api/games/7', () => HttpResponse.error()));

    const user = await openConfirmation();
    await user.click(screen.getByRole('button', confirm));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Delete Doomed' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes with Esc', async () => {
    const user = await openConfirmation();
    screen.getByRole('button', { name: 'Cancel' }).focus(); // showModal does this in a browser, not in jsdom's polyfill
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
