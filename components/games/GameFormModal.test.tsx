import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useRouter } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw/server';
import { makeGame } from '@/test/game-factory';
import { GameFormModal } from './GameFormModal';

const LABELS = {
  title: 'Title',
  developer: /developer/i,
  genre: /genre/i,
  revenue: /revenue/i,
  downloads: /downloads/i,
  rating: /rating/i,
};

const validValues = { title: 'New Game', developer: 'Me', genre: 'Puzzle', revenue: '100.5', downloads: '10', rating: '4.2' };

async function fill(user: UserEvent, overrides: Partial<typeof validValues> = {}) {
  const values = { ...validValues, ...overrides };
  for (const key of Object.keys(LABELS) as (keyof typeof LABELS)[]) {
    if (values[key] !== '') await user.type(screen.getByLabelText(LABELS[key]), values[key]);
  }
}

const save = (user: UserEvent) => user.click(screen.getByRole('button', { name: /save/i }));

/** Records what the API receives and answers with the default handler's shape. */
function captureRequests(method: 'post' | 'put', path: string) {
  const bodies: unknown[] = [];
  server.use(
    http[method](path, async ({ request }) => {
      const body = await request.json();
      bodies.push(body);
      return HttpResponse.json(makeGame(), { status: method === 'post' ? 201 : 200 });
    }),
  );
  return bodies;
}

describe('GameFormModal: create', () => {
  it('sends numbers, not strings, then refreshes the data and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const bodies = captureRequests('post', '*/api/games');
    render(<GameFormModal onClose={onClose} />);

    await fill(user);
    await save(user);

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(bodies).toEqual([
      { title: 'New Game', developer: 'Me', genre: 'Puzzle', monthly_revenue_usd: 100.5, monthly_downloads: 10, average_rating: 4.2 },
    ]);
    expect(useRouter().refresh).toHaveBeenCalledOnce();
  });

  it.each([
    ['revenue', LABELS.revenue],
    ['downloads', LABELS.downloads],
    ['rating', LABELS.rating],
  ] as const)('treats an empty %s as an error, not as 0', async (key, label) => {
    const user = userEvent.setup();
    const bodies = captureRequests('post', '*/api/games');
    render(<GameFormModal onClose={vi.fn()} />);

    await fill(user, { [key]: '' });
    await save(user);

    expect(await screen.findByText('Required')).toBeInTheDocument();
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    expect(bodies).toEqual([]);
  });

  it('accepts 0 as a real number', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const bodies = captureRequests('post', '*/api/games');
    render(<GameFormModal onClose={onClose} />);

    await fill(user, { revenue: '0', downloads: '0', rating: '0' });
    await save(user);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(bodies[0]).toMatchObject({ monthly_revenue_usd: 0, monthly_downloads: 0, average_rating: 0 });
  });

  it.each([
    ['text', 'abc', 'Must be a number'],
    ['a thousands separator', '1,000', 'Must be a number'],
    ['hexadecimal', '0x10', 'Must be a number'],
  ])('rejects %s in a numeric field', async (_name, revenue, message) => {
    const user = userEvent.setup();
    const bodies = captureRequests('post', '*/api/games');
    render(<GameFormModal onClose={vi.fn()} />);

    await fill(user, { revenue });
    await save(user);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it.each([
    ['a rating above 5', { rating: '7' }, LABELS.rating],
    ['negative revenue', { revenue: '-1' }, LABELS.revenue],
    ['fractional downloads', { downloads: '1.5' }, LABELS.downloads],
  ])('validates %s on the client with the shared schema', async (_name, overrides, label) => {
    const user = userEvent.setup();
    const bodies = captureRequests('post', '*/api/games');
    render(<GameFormModal onClose={vi.fn()} />);

    await fill(user, overrides);
    await save(user);

    await waitFor(() => expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true'));
    expect(bodies).toEqual([]);
  });

  it('marks every blank field and whitespace-only text as required', async () => {
    const user = userEvent.setup();
    render(<GameFormModal onClose={vi.fn()} />);

    await user.type(screen.getByLabelText(LABELS.title), '   ');
    await save(user);

    expect(await screen.findAllByText('Required')).toHaveLength(6);
  });

  it('clears the error of a field when it is edited', async () => {
    const user = userEvent.setup();
    render(<GameFormModal onClose={vi.fn()} />);

    await save(user);
    await user.type(screen.getByLabelText(LABELS.title), 'x');

    expect(screen.getByLabelText(LABELS.title)).not.toHaveAttribute('aria-invalid');
    expect(screen.getAllByText('Required')).toHaveLength(5);
  });

  it('shows the 400 issues of the server next to each field and stays open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(
      http.post('*/api/games', () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', issues: { average_rating: ['Max is 5'] } } },
          { status: 400 },
        ),
      ),
    );
    render(<GameFormModal onClose={onClose} />);

    await fill(user);
    await save(user);

    expect(await screen.findByText('Max is 5')).toBeInTheDocument();
    expect(screen.getByLabelText(LABELS.rating)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(LABELS.rating)).toHaveAccessibleDescription('Max is 5');
    expect(onClose).not.toHaveBeenCalled();
    expect(useRouter().refresh).not.toHaveBeenCalled();
  });

  it('shows a banner for a 500 and keeps what the user typed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(http.post('*/api/games', () => HttpResponse.json({ error: { code: 'INTERNAL', message: 'Something went wrong' } }, { status: 500 })));
    render(<GameFormModal onClose={onClose} />);

    await fill(user);
    await save(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByLabelText(LABELS.title)).toHaveValue('New Game');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });

  it('shows a banner when the network fails', async () => {
    const user = userEvent.setup();
    server.use(http.post('*/api/games', () => HttpResponse.error()));
    render(<GameFormModal onClose={vi.fn()} />);

    await fill(user);
    await save(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/reach the server/i);
  });

  it('disables saving while the request runs, so a double click sends once', async () => {
    const user = userEvent.setup();
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const handler = vi.fn(async () => {
      await gate;
      return HttpResponse.json(makeGame(), { status: 201 });
    });
    server.use(http.post('*/api/games', handler));
    const onClose = vi.fn();
    render(<GameFormModal onClose={onClose} />);

    await fill(user);
    await save(user);

    const button = await screen.findByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
    await user.click(button);
    screen.getByLabelText(LABELS.title).focus();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    release();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('GameFormModal: edit', () => {
  const game = makeGame({ id: 7, title: 'Old Title', monthly_revenue_usd: 12.5, monthly_downloads: 0, average_rating: 0 });

  it('starts with the values of the game, including zeros', () => {
    render(<GameFormModal game={game} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Edit Old Title' })).toBeInTheDocument();
    expect(screen.getByLabelText(LABELS.title)).toHaveValue('Old Title');
    expect(screen.getByLabelText(LABELS.revenue)).toHaveValue('12.5');
    expect(screen.getByLabelText(LABELS.downloads)).toHaveValue('0');
    expect(screen.getByLabelText(LABELS.rating)).toHaveValue('0');
  });

  it('puts the changes to the game and refreshes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const bodies = captureRequests('put', '*/api/games/7');
    render(<GameFormModal game={game} onClose={onClose} />);

    await user.clear(screen.getByLabelText(LABELS.title));
    await user.type(screen.getByLabelText(LABELS.title), 'New Title');
    await save(user);

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(bodies[0]).toMatchObject({ title: 'New Title', monthly_revenue_usd: 12.5 });
    expect(useRouter().refresh).toHaveBeenCalledOnce();
  });

  it('errors when a number is erased instead of saving 0', async () => {
    const user = userEvent.setup();
    const bodies = captureRequests('put', '*/api/games/7');
    render(<GameFormModal game={game} onClose={vi.fn()} />);

    await user.clear(screen.getByLabelText(LABELS.revenue));
    await save(user);

    expect(await screen.findByText('Required')).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('says so and refreshes when the game no longer exists', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    server.use(http.put('*/api/games/7', () => HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Game 7 not found' } }, { status: 404 })));
    render(<GameFormModal game={game} onClose={onClose} />);

    await save(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('This game no longer exists.');
    expect(useRouter().refresh).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('GameFormModal: closing', () => {
  it('closes with Esc', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GameFormModal onClose={onClose} />);
    screen.getByLabelText(LABELS.title).focus(); // showModal does this in a browser, not in jsdom's polyfill
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes with Cancel without calling the API', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const bodies = captureRequests('post', '*/api/games');
    render(<GameFormModal onClose={onClose} />);
    await user.type(screen.getByLabelText(LABELS.title), 'x');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(bodies).toEqual([]);
  });
});
